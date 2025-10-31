const persistence = require('./persistence');

const inMemoryStore = new Map(); // topicId -> { payload, insertedAt, validUntil, status, sensitiveData }
const lastEventHashPerTopic = new Map(); // topicId -> contentHash (string)
const lastEventTypePerTopic = new Map(); // topicId -> 'issued'|'verified'|'paid'|'dispensed'
const usedNonces = new Set(); // nonce strings to prevent replay
const offlineQueue = []; // { topicId, message: Buffer, attempts }
const hashLookup = new Map(); // truncated hash -> full hash (for HCS payload compression)
const hcsEventLog = []; // Chronological log of all prescription events for admin dashboard
let online = true;
let maxStoreSize = 200; // soft cap
let maxEventLogSize = 1000; // Maximum events to store

// Register stores for persistence
persistence.register('inMemoryStore', inMemoryStore);
persistence.register('lastEventHashPerTopic', lastEventHashPerTopic);
persistence.register('lastEventTypePerTopic', lastEventTypePerTopic);
persistence.register('usedNonces', usedNonces);
persistence.register('hashLookup', hashLookup);
persistence.register('hcsEventLog', hcsEventLog);

function setOnline(v) { online = !!v; }
function isOnline() { return online; }

function putPayload(topicId, payload) {
  inMemoryStore.set(topicId, { payload, insertedAt: Date.now(), validUntil: Date.parse(payload?.validUntil || '') || null, status: 'issued' });
  pruneIfNeeded();
  persistence.markDirty();
}

function getPayload(topicId) {
  const entry = inMemoryStore.get(topicId);
  return entry?.payload || null;
}

function setTopicStatus(topicId, status) {
  const entry = inMemoryStore.get(topicId);
  if (entry) {
    entry.status = status;
    inMemoryStore.set(topicId, entry);
  } else {
    inMemoryStore.set(topicId, { payload: null, insertedAt: Date.now(), validUntil: null, status });
  }
  persistence.markDirty();
}

function getTopicStatus(topicId) {
  const entry = inMemoryStore.get(topicId);
  return entry?.status || null;
}

function queueMessage(topicId, messageObj) {
  const buffer = Buffer.from(JSON.stringify(messageObj));
  offlineQueue.push({ topicId, message: buffer, attempts: 0 });
}

function drainQueue(submitFn, maxAttempts = 3) {
  for (let i = 0; i < offlineQueue.length; ) {
    const item = offlineQueue[i];
    try {
      submitFn(item.topicId, item.message);
      offlineQueue.splice(i, 1);
    } catch (e) {
      item.attempts += 1;
      if (item.attempts >= maxAttempts) {
        // Drop or keep; here we keep but advance index to avoid infinite loop
        i++;
      } else {
        i++;
      }
    }
  }
}

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of inMemoryStore.entries()) {
    if (v?.validUntil && now > v.validUntil) {
      inMemoryStore.delete(k);
    }
  }
}

function pruneIfNeeded() {
  if (inMemoryStore.size <= maxStoreSize) return;
  // Remove oldest entries
  const entries = Array.from(inMemoryStore.entries());
  entries.sort((a, b) => (a[1].insertedAt || 0) - (b[1].insertedAt || 0));
  const removeCount = Math.max(0, inMemoryStore.size - maxStoreSize);
  for (let i = 0; i < removeCount; i++) {
    inMemoryStore.delete(entries[i][0]);
  }
}

/**
 * Store sensitive data removed from HCS payloads (for CNDP compliance)
 * @param {string} topicId - Topic ID
 * @param {Object} sensitiveData - Data to store (drugIds, items, totals, preciseGeoTag, etc.)
 */
function putSensitiveData(topicId, sensitiveData) {
  const entry = inMemoryStore.get(topicId) || { payload: null, insertedAt: Date.now(), validUntil: null, status: 'issued' };
  entry.sensitiveData = sensitiveData;
  inMemoryStore.set(topicId, entry);
  persistence.markDirty();
}

/**
 * Get sensitive data for a topic
 * @param {string} topicId - Topic ID
 * @returns {Object|null} Sensitive data or null
 */
function getSensitiveData(topicId) {
  const entry = inMemoryStore.get(topicId);
  return entry?.sensitiveData || null;
}

/**
 * Log an HCS event to the event log (for admin dashboard)
 * @param {Object} event - Event object with properties: topicID, eventType, timestamp, signerRole, etc.
 */
function logHCSEvent(event) {
  // Add timestamp if not present
  if (!event.timestamp) {
    event.timestamp = new Date().toISOString();
  }
  
  // Add to the front (newest first)
  hcsEventLog.unshift(event);
  
  // Prune if needed
  if (hcsEventLog.length > maxEventLogSize) {
    hcsEventLog.splice(maxEventLogSize);
  }
  
  persistence.markDirty();
}

/**
 * Get all HCS events (optionally filtered by event type)
 * @param {string} filter - Event type to filter by ('all', 'issued', 'verified', 'paid', 'dispensed')
 * @returns {Array} Array of event objects
 */
function getHCSEvents(filter = 'all') {
  if (filter === 'all') {
    return [...hcsEventLog]; // Return a copy
  }
  return hcsEventLog.filter(event => event.eventType === filter);
}

module.exports = {
  inMemoryStore,
  lastEventHashPerTopic,
  lastEventTypePerTopic,
  usedNonces,
  offlineQueue,
  hashLookup,
  hcsEventLog,
  setOnline,
  isOnline,
  putPayload,
  getPayload,
  queueMessage,
  drainQueue,
  pruneExpired,
  setTopicStatus,
  getTopicStatus,
  putSensitiveData,
  getSensitiveData,
  logHCSEvent,
  getHCSEvents,
  persistence // Export persistence for server initialization
};


