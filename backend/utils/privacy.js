const crypto = require('crypto');

/**
 * Hash a sensitive identifier for CNDP compliance. Never store raw PII on-chain or in QR.
 * @param {string} value - raw value (e.g., patientId or email)
 * @param {string} salt - project-wide salt from env
 * @param {string} nonce - per-prescription nonce
 * @returns {string} hex sha256 hash
 */
function hashIdentifier(value, salt, nonce) {
  const h = crypto.createHash('sha256');
  h.update(String(value || ''));
  h.update(String(salt || ''));
  h.update(String(nonce || ''));
  return h.digest('hex');
}

module.exports = { hashIdentifier };
