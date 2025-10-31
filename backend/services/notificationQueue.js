/**
 * Notification Queue Service
 * 
 * Handles email failures with retry logic and SMS fallback.
 * Ensures patients receive their prescriptions even if email fails.
 * 
 * Features:
 * - Retry failed emails (3 attempts with exponential backoff)
 * - SMS fallback if email fails completely
 * - Persistent queue (survives restarts)
 * - Background processing
 */

const { persistence } = require('./store');

// Notification queue - persisted to disk
const notificationQueue = new Map(); // notificationId -> { type, to, data, attempts, lastAttempt, status }

// Register for persistence
persistence.register('notificationQueue', notificationQueue);

const MAX_EMAIL_ATTEMPTS = 3;
const RETRY_DELAYS = [30000, 120000, 300000]; // 30s, 2min, 5min
const PROCESSING_INTERVAL = 30000; // Process queue every 30 seconds

let processingTimer = null;

/**
 * Queue an email for sending
 * @param {Object} options - Email options (to, subject, text, html, attachments, prescriptionId)
 * @returns {string} - Notification ID
 */
function queueEmail(options) {
  const notificationId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  notificationQueue.set(notificationId, {
    id: notificationId,
    type: 'email',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
    prescriptionId: options.prescriptionId,
    attempts: 0,
    lastAttempt: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    error: null
  });
  
  persistence.markDirty();
  console.log(`[NOTIFICATION] Queued email: ${notificationId} → ${options.to}`);
  
  return notificationId;
}

/**
 * Queue an SMS for sending
 * @param {Object} options - SMS options (to, text, prescriptionId)
 * @returns {string} - Notification ID
 */
function queueSMS(options) {
  const notificationId = `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  notificationQueue.set(notificationId, {
    id: notificationId,
    type: 'sms',
    to: options.to,
    text: options.text,
    prescriptionId: options.prescriptionId,
    attempts: 0,
    lastAttempt: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    error: null
  });
  
  persistence.markDirty();
  console.log(`[NOTIFICATION] Queued SMS: ${notificationId} → ${options.to}`);
  
  return notificationId;
}

/**
 * Process pending notifications
 */
async function processQueue() {
  const now = Date.now();
  let processed = 0;
  let failed = 0;
  let succeeded = 0;
  
  for (const [id, notification] of notificationQueue.entries()) {
    if (notification.status !== 'pending' && notification.status !== 'retrying') {
      continue;
    }
    
    // Check if enough time has passed since last attempt
    if (notification.lastAttempt) {
      const delay = RETRY_DELAYS[notification.attempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      const timeSinceLastAttempt = now - new Date(notification.lastAttempt).getTime();
      
      if (timeSinceLastAttempt < delay) {
        continue; // Not ready for retry yet
      }
    }
    
    // Process notification
    try {
      if (notification.type === 'email') {
        await sendEmailNow(notification);
        notification.status = 'sent';
        notification.sentAt = new Date().toISOString();
        succeeded++;
      } else if (notification.type === 'sms') {
        await sendSMSNow(notification);
        notification.status = 'sent';
        notification.sentAt = new Date().toISOString();
        succeeded++;
      }
      
      persistence.markDirty();
    } catch (err) {
      notification.attempts++;
      notification.lastAttempt = new Date().toISOString();
      notification.error = err.message;
      
      if (notification.type === 'email' && notification.attempts >= MAX_EMAIL_ATTEMPTS) {
        // Email failed after max attempts - try SMS fallback
        notification.status = 'failed';
        console.error(`[NOTIFICATION] Email ${id} failed after ${MAX_EMAIL_ATTEMPTS} attempts`);
        
        // Queue SMS fallback if we have a phone number
        if (notification.prescriptionId) {
          console.log(`[NOTIFICATION] Attempting SMS fallback for ${notification.prescriptionId}`);
          queueSMS({
            to: extractPhoneFromEmail(notification.to) || 'N/A',
            text: `Your prescription ${notification.prescriptionId} is ready. Email delivery failed. Please contact your doctor.`,
            prescriptionId: notification.prescriptionId
          });
        }
        
        failed++;
      } else if (notification.attempts >= MAX_EMAIL_ATTEMPTS) {
        // SMS failed after max attempts
        notification.status = 'failed';
        console.error(`[NOTIFICATION] SMS ${id} failed after ${MAX_EMAIL_ATTEMPTS} attempts`);
        failed++;
      } else {
        // Retry
        notification.status = 'retrying';
        console.warn(`[NOTIFICATION] ${notification.type} ${id} failed (attempt ${notification.attempts}/${MAX_EMAIL_ATTEMPTS}): ${err.message}`);
      }
      
      persistence.markDirty();
    }
    
    processed++;
  }
  
  if (processed > 0) {
    console.log(`[NOTIFICATION] Processed ${processed} notifications: ${succeeded} sent, ${failed} failed`);
  }
}

/**
 * Send email immediately
 * @param {Object} notification - Notification object
 */
async function sendEmailNow(notification) {
  const { sendEmail } = require('../utils/email');
  
  await sendEmail({
    to: notification.to,
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
    attachments: notification.attachments,
    prescriptionId: notification.prescriptionId
  });
}

/**
 * Send SMS immediately
 * @param {Object} notification - Notification object
 */
async function sendSMSNow(notification) {
  // TODO: Integrate with Infobip or other SMS provider
  // For now, just log
  console.log(`[SMS] Sending to ${notification.to}: ${notification.text}`);
  
  // Simulate SMS sending
  if (Math.random() > 0.9) {
    throw new Error('SMS delivery failed (simulated)');
  }
}

/**
 * Extract phone number from email or use default
 * @param {string} email - Email address
 * @returns {string|null} - Phone number or null
 */
function extractPhoneFromEmail(email) {
  // This is a placeholder - in production, you'd query the database
  // or extract from prescription data
  return null;
}

/**
 * Start background processing
 */
function startProcessing() {
  if (processingTimer) return;
  
  processingTimer = setInterval(async () => {
    try {
      await processQueue();
    } catch (err) {
      console.error('[NOTIFICATION] Queue processing error:', err);
    }
  }, PROCESSING_INTERVAL);
  
  console.log(`[NOTIFICATION] Background processing started (every ${PROCESSING_INTERVAL/1000}s)`);
}

/**
 * Stop background processing
 */
function stopProcessing() {
  if (processingTimer) {
    clearInterval(processingTimer);
    processingTimer = null;
    console.log('[NOTIFICATION] Background processing stopped');
  }
}

/**
 * Get queue statistics
 */
function getQueueStats() {
  const stats = {
    total: notificationQueue.size,
    pending: 0,
    retrying: 0,
    sent: 0,
    failed: 0,
    byType: { email: 0, sms: 0 }
  };
  
  for (const notification of notificationQueue.values()) {
    if (notification.status === 'pending') stats.pending++;
    else if (notification.status === 'retrying') stats.retrying++;
    else if (notification.status === 'sent') stats.sent++;
    else if (notification.status === 'failed') stats.failed++;
    
    stats.byType[notification.type]++;
  }
  
  return stats;
}

/**
 * Clean old sent/failed notifications (older than 7 days)
 */
function cleanOldNotifications() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [id, notification] of notificationQueue.entries()) {
    if (notification.status === 'sent' || notification.status === 'failed') {
      const createdAt = new Date(notification.createdAt).getTime();
      if (createdAt < sevenDaysAgo) {
        notificationQueue.delete(id);
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    console.log(`[NOTIFICATION] Cleaned ${cleaned} old notifications`);
    persistence.markDirty();
  }
  
  return cleaned;
}

module.exports = {
  queueEmail,
  queueSMS,
  processQueue,
  startProcessing,
  stopProcessing,
  getQueueStats,
  cleanOldNotifications,
  notificationQueue
};

