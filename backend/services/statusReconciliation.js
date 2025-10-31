/**
 * Status Reconciliation Service
 * 
 * Handles Mirror Node indexing delays and ensures consistent prescription status.
 * 
 * PROBLEM:
 * - HCS message submitted successfully
 * - Immediate Mirror Node query returns no messages (indexing delay 5-30 seconds)
 * - Status incorrectly defaults to 'issued'
 * 
 * SOLUTION:
 * - Track "pending confirmation" states
 * - Retry queries with exponential backoff
 * - Background reconciliation job
 * - Pessimistic locking for dispense operations
 */

const { inMemoryStore, setTopicStatus, persistence } = require('./store');
const { getTopicStatusFromHedera } = require('../utils/mirror');

// Track topics awaiting Mirror Node confirmation
// topicId -> { status, timestamp, retries, confirmed }
const pendingConfirmations = new Map();

// Track active dispense operations to prevent race conditions
// topicId -> { pharmacistId, timestamp }
const activeDispenseOperations = new Map();

const MAX_RETRIES = 5;
const RETRY_DELAYS = [2000, 5000, 10000, 20000, 30000]; // Exponential backoff
const RECONCILIATION_INTERVAL = 60000; // 1 minute
const DISPENSE_LOCK_TIMEOUT = 30000; // 30 seconds

/**
 * Submit a status update with pending confirmation tracking
 * @param {string} topicId - Topic ID
 * @param {string} newStatus - Status to set
 * @param {Object} metadata - Additional metadata
 */
function submitStatusUpdate(topicId, newStatus, metadata = {}) {
  // Set status optimistically
  setTopicStatus(topicId, newStatus);
  
  // Track for confirmation
  pendingConfirmations.set(topicId, {
    status: newStatus,
    timestamp: Date.now(),
    retries: 0,
    confirmed: false,
    metadata
  });
  
  console.log(`[RECONCILIATION] Submitted ${newStatus} for topic ${topicId} (pending confirmation)`);
  
  // Schedule retry
  scheduleRetry(topicId);
}

/**
 * Schedule retry for confirmation
 * @param {string} topicId - Topic ID
 */
function scheduleRetry(topicId) {
  const pending = pendingConfirmations.get(topicId);
  if (!pending || pending.confirmed) return;
  
  const delay = RETRY_DELAYS[pending.retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
  
  setTimeout(async () => {
    await retryConfirmation(topicId);
  }, delay);
}

/**
 * Retry confirmation for a topic
 * @param {string} topicId - Topic ID
 */
async function retryConfirmation(topicId) {
  const pending = pendingConfirmations.get(topicId);
  if (!pending || pending.confirmed) return;
  
  try {
    // Query Mirror Node
    const mirrorStatus = await getTopicStatusFromHedera(topicId);
    
    // Check if status matches
    if (mirrorStatus === pending.status) {
      pending.confirmed = true;
      console.log(`[RECONCILIATION] ✅ Confirmed ${pending.status} for topic ${topicId} after ${pending.retries} retries`);
      pendingConfirmations.delete(topicId);
      return;
    }
    
    // Status mismatch - update local status
    if (mirrorStatus !== 'unknown') {
      console.warn(`[RECONCILIATION] Status mismatch for ${topicId}: expected ${pending.status}, got ${mirrorStatus}`);
      setTopicStatus(topicId, mirrorStatus);
      pending.status = mirrorStatus;
      pending.confirmed = true;
      pendingConfirmations.delete(topicId);
      return;
    }
    
    // Still not indexed, retry
    pending.retries++;
    if (pending.retries < MAX_RETRIES) {
      console.log(`[RECONCILIATION] Retry ${pending.retries}/${MAX_RETRIES} for topic ${topicId}`);
      scheduleRetry(topicId);
    } else {
      console.error(`[RECONCILIATION] ❌ Failed to confirm ${pending.status} for topic ${topicId} after ${MAX_RETRIES} retries`);
      pending.confirmed = false; // Mark as failed
    }
  } catch (err) {
    console.error(`[RECONCILIATION] Error confirming status for ${topicId}:`, err.message);
    pending.retries++;
    if (pending.retries < MAX_RETRIES) {
      scheduleRetry(topicId);
    }
  }
}

/**
 * Acquire lock for dispense operation (prevent double-dispensing)
 * @param {string} topicId - Topic ID
 * @param {string} pharmacistId - Pharmacist national ID
 * @returns {boolean} - True if lock acquired
 */
function acquireDispenseLock(topicId, pharmacistId) {
  const existing = activeDispenseOperations.get(topicId);
  
  // Check if already locked
  if (existing) {
    const age = Date.now() - existing.timestamp;
    
    // If lock is old (timeout), release it
    if (age > DISPENSE_LOCK_TIMEOUT) {
      console.warn(`[RECONCILIATION] Lock timeout for topic ${topicId}, releasing`);
      activeDispenseOperations.delete(topicId);
    } else {
      console.error(`[RECONCILIATION] ❌ Dispense operation already in progress for topic ${topicId} by ${existing.pharmacistId}`);
      return false;
    }
  }
  
  // Acquire lock
  activeDispenseOperations.set(topicId, {
    pharmacistId,
    timestamp: Date.now()
  });
  
  console.log(`[RECONCILIATION] 🔒 Dispense lock acquired for topic ${topicId} by ${pharmacistId}`);
  return true;
}

/**
 * Release dispense lock
 * @param {string} topicId - Topic ID
 */
function releaseDispenseLock(topicId) {
  activeDispenseOperations.delete(topicId);
  console.log(`[RECONCILIATION] 🔓 Dispense lock released for topic ${topicId}`);
}

/**
 * Check if topic is locked for dispensing
 * @param {string} topicId - Topic ID
 * @returns {boolean}
 */
function isDispenseLocked(topicId) {
  const lock = activeDispenseOperations.get(topicId);
  if (!lock) return false;
  
  const age = Date.now() - lock.timestamp;
  if (age > DISPENSE_LOCK_TIMEOUT) {
    activeDispenseOperations.delete(topicId);
    return false;
  }
  
  return true;
}

/**
 * Background reconciliation job - runs every minute
 * Checks all prescriptions and reconciles status with Hedera
 */
async function runReconciliation() {
  try {
    console.log('[RECONCILIATION] Running background reconciliation...');
    
    const topics = Array.from(inMemoryStore.keys());
    let reconciledCount = 0;
    let mismatchCount = 0;
    
    for (const topicId of topics) {
      try {
        const entry = inMemoryStore.get(topicId);
        if (!entry) continue;
        
        const localStatus = entry.status;
        const mirrorStatus = await getTopicStatusFromHedera(topicId);
        
        if (mirrorStatus !== 'unknown' && mirrorStatus !== localStatus) {
          console.warn(`[RECONCILIATION] Mismatch found: ${topicId} local=${localStatus} mirror=${mirrorStatus}`);
          setTopicStatus(topicId, mirrorStatus);
          mismatchCount++;
        }
        
        reconciledCount++;
      } catch (err) {
        console.error(`[RECONCILIATION] Error reconciling ${topicId}:`, err.message);
      }
    }
    
    console.log(`[RECONCILIATION] Reconciliation complete: ${reconciledCount} topics checked, ${mismatchCount} mismatches fixed`);
  } catch (err) {
    console.error('[RECONCILIATION] Background reconciliation error:', err);
  }
}

/**
 * Start background reconciliation job
 */
function startReconciliationJob() {
  const intervalId = setInterval(runReconciliation, RECONCILIATION_INTERVAL);
  console.log(`[RECONCILIATION] Background reconciliation started (every ${RECONCILIATION_INTERVAL/1000}s)`);
  return intervalId;
}

/**
 * Check if a topic status is confirmed
 * @param {string} topicId - Topic ID
 * @returns {Object} - { confirmed: boolean, status: string, isPending: boolean }
 */
function getConfirmationStatus(topicId) {
  const pending = pendingConfirmations.get(topicId);
  
  if (!pending) {
    return { confirmed: true, status: null, isPending: false };
  }
  
  return {
    confirmed: pending.confirmed,
    status: pending.status,
    isPending: true,
    retries: pending.retries,
    age: Date.now() - pending.timestamp
  };
}

module.exports = {
  submitStatusUpdate,
  acquireDispenseLock,
  releaseDispenseLock,
  isDispenseLocked,
  startReconciliationJob,
  runReconciliation,
  getConfirmationStatus,
  pendingConfirmations,
  activeDispenseOperations
};

