const crypto = require('crypto');

// Simple in-memory OTP store with TTL. Replace with Redis for production.
const store = new Map();

/**
 * Issue an OTP tied to a reference. Returns { ref, otp, expiresAt }.
 * @param {string} ref - business reference (e.g., prescriptionId)
 * @param {number} ttlSeconds - time to live in seconds
 */
function issueOtp(ref, ttlSeconds = 300) {
  const otp = ('' + (Math.floor(100000 + Math.random() * 900000)));
  const token = crypto.randomBytes(8).toString('hex');
  const key = `${ref}:${token}`;
  const expiresAt = Date.now() + ttlSeconds * 1000;
  store.set(key, { otp, ref, expiresAt });
  return { ref, token, otp, expiresAt };
}

/**
 * Verify an OTP by ref + token + otp.
 */
function verifyOtp(ref, token, otp) {
  const key = `${ref}:${token}`;
  const item = store.get(key);
  if (!item) return false;
  const valid = item.otp === String(otp) && item.expiresAt > Date.now();
  if (valid) store.delete(key);
  return valid;
}

module.exports = { issueOtp, verifyOtp };
