/**
 * Hash Utilities for HCS Payload Optimization
 * Provides safe hash truncation with collision tracking
 */

const crypto = require('crypto');

/**
 * Truncate a SHA-256 hash to save space in HCS messages
 * @param {string} fullHash - Full hash (with or without prefix like "sha256:")
 * @param {number} length - Number of hex characters to keep (default: 8)
 * @returns {string} Truncated hash
 */
function truncateHash(fullHash, length = 8) {
  if (!fullHash) return '';
  
  // Remove common prefixes
  const cleaned = fullHash.replace(/^(sha256:|hex:)/, '');
  
  // Validate hex string
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    console.warn('Invalid hash format:', fullHash);
    return cleaned.slice(0, length);
  }
  
  return cleaned.slice(0, length).toLowerCase();
}

/**
 * Expand a truncated hash using lookup table
 * @param {string} truncatedHash - Truncated hash
 * @param {Map} lookupMap - Map of truncated → full hashes
 * @returns {string|null} Full hash or null if not found
 */
function expandHash(truncatedHash, lookupMap) {
  if (!truncatedHash || !lookupMap) return null;
  return lookupMap.get(truncatedHash.toLowerCase()) || null;
}

/**
 * Generate a hash and store the truncated → full mapping
 * @param {string} data - Data to hash
 * @param {Map} lookupMap - Map to store the mapping
 * @param {number} truncateLength - Truncation length
 * @returns {Object} { full, truncated }
 */
function hashAndStore(data, lookupMap, truncateLength = 8) {
  const full = crypto.createHash('sha256').update(data).digest('hex');
  const truncated = truncateHash(full, truncateLength);
  
  if (lookupMap) {
    // Check for collision
    const existing = lookupMap.get(truncated);
    if (existing && existing !== full) {
      console.warn(`Hash collision detected! Truncated: ${truncated}`);
      console.warn(`Existing: ${existing}`);
      console.warn(`New: ${full}`);
      // Use longer truncation to avoid collision
      const longerTruncated = truncateHash(full, truncateLength + 4);
      lookupMap.set(longerTruncated, full);
      return { full, truncated: longerTruncated };
    }
    
    lookupMap.set(truncated, full);
  }
  
  return { full, truncated };
}

/**
 * Remove hash prefix (sha256:, hex:) to save space
 * @param {string} hash - Hash with optional prefix
 * @returns {string} Hash without prefix
 */
function removeHashPrefix(hash) {
  if (!hash) return '';
  return hash.replace(/^(sha256:|hex:)/, '');
}

/**
 * Add sha256: prefix for compatibility
 * @param {string} hash - Hash without prefix
 * @returns {string} Hash with sha256: prefix
 */
function addHashPrefix(hash) {
  if (!hash) return '';
  if (hash.startsWith('sha256:')) return hash;
  return `sha256:${hash}`;
}

/**
 * Calculate collision probability for truncated hashes
 * @param {number} truncateLength - Number of hex chars
 * @param {number} numHashes - Expected number of hashes
 * @returns {number} Collision probability (0-1)
 */
function collisionProbability(truncateLength, numHashes) {
  // Birthday problem approximation
  const possibleValues = Math.pow(16, truncateLength);
  return 1 - Math.exp(-(numHashes * numHashes) / (2 * possibleValues));
}

module.exports = {
  truncateHash,
  expandHash,
  hashAndStore,
  removeHashPrefix,
  addHashPrefix,
  collisionProbability
};

