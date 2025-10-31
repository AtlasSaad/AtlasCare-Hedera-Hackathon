import elliptic from 'elliptic';
import indexedDBManager from './indexedDB';

const ec = new elliptic.ec('secp256k1');

/**
 * Verify prescription signature offline using ECDSA
 * @param {Object} qrPayload - Full QR payload with signature
 * @param {String} publicKeyHex - Doctor's public key (cached)
 * @returns {Boolean} - Signature valid
 */
export async function verifyOfflineSignature(qrPayload, publicKeyHex) {
  try {
    if (!qrPayload || !publicKeyHex) {
      console.warn('Missing QR payload or public key for offline verification');
      return false;
    }

    // Extract signature
    const signature = qrPayload.s?.replace(/^hex:/i, '');
    if (!signature) {
      console.warn('No signature found in QR payload');
      return false;
    }

    // Reconstruct payload for hashing (exclude signature)
    const payloadToVerify = { ...qrPayload };
    delete payloadToVerify.s;

    // Create canonical JSON string (sorted keys for consistent hashing)
    const canonicalPayload = JSON.stringify(payloadToVerify, Object.keys(payloadToVerify).sort());

    // Verify signature using elliptic
    const key = ec.keyFromPublic(publicKeyHex, 'hex');
    
    // Hash the payload (SHA-256)
    const crypto = window.crypto || window.msCrypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Verify signature
    const isValid = key.verify(hashArray, signature);
    
    return isValid;
  } catch (error) {
    console.error('Offline signature verification failed:', error);
    return false;
  }
}

/**
 * Check if prescription exists in local cache
 * @param {String} topicID - Prescription topic ID
 * @returns {Object|null} - Cached prescription or null
 */
export async function verifyAgainstCache(topicID) {
  try {
    const cached = await indexedDBManager.getPrescriptionByTopicId(topicID);
    
    if (cached) {
      console.log('Prescription found in offline cache:', topicID);
      return cached;
    }
    
    console.warn('Prescription not found in offline cache:', topicID);
    return null;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

/**
 * Check if nonce has been used (replay prevention)
 * @param {String} nonce - Nonce from QR payload
 * @returns {Boolean} - true if nonce is already used
 */
export async function isNonceUsed(nonce) {
  try {
    if (!nonce) return false;
    
    const used = await indexedDBManager.isNonceUsed(nonce);
    return used;
  } catch (error) {
    console.error('Error checking nonce:', error);
    return false;
  }
}

/**
 * Mark nonce as used
 * @param {String} nonce - Nonce to mark as used
 */
export async function markNonceAsUsed(nonce) {
  try {
    if (!nonce) return;
    
    await indexedDBManager.addUsedNonce(nonce);
  } catch (error) {
    console.error('Error marking nonce as used:', error);
  }
}

/**
 * Perform complete offline verification
 * @param {Object} qrPayload - Full QR payload
 * @param {Object} options - Optional parameters
 * @returns {Object} - { valid, reason, prescription }
 */
export async function performOfflineVerification(qrPayload, options = {}) {
  try {
    // 1. Check QR version
    if (qrPayload?.v && qrPayload.v !== "1.0") {
      return { valid: false, reason: 'Unsupported QR version', prescription: null };
    }

    // 2. Check expiration
    if (qrPayload?.u) {
      const validUntil = new Date(qrPayload.u);
      const now = new Date();
      
      if (now > validUntil) {
        return { valid: false, reason: 'Prescription expired', prescription: null };
      }
    }

    // 3. Check nonce replay
    if (qrPayload?.n) {
      const nonceUsed = await isNonceUsed(qrPayload.n);
      if (nonceUsed) {
        return { valid: false, reason: 'Duplicate prescription nonce (already used)', prescription: null };
      }
    }

    // 4. Check dispense count
    if (qrPayload?.dc !== undefined && qrPayload?.md !== undefined) {
      if (qrPayload.dc >= qrPayload.md) {
        return { 
          valid: false, 
          reason: `Prescription fully dispensed (${qrPayload.dc}/${qrPayload.md})`,
          prescription: null 
        };
      }
    }

    // 5. Get cached prescription
    const cached = await verifyAgainstCache(qrPayload.t);
    if (!cached) {
      return { valid: false, reason: 'Prescription not found in offline cache', prescription: null };
    }

    // 6. Get doctor's public key from cache
    const doctorPublicKey = options.doctorPublicKey || cached.doctorPublicKey;
    if (!doctorPublicKey) {
      return { valid: false, reason: 'Doctor public key not cached, cannot verify offline', prescription: null };
    }

    // 7. Verify signature
    const signatureValid = await verifyOfflineSignature(qrPayload, doctorPublicKey);
    if (!signatureValid) {
      return { valid: false, reason: 'Invalid signature', prescription: null };
    }

    // 8. Mark nonce as used
    if (qrPayload?.n) {
      await markNonceAsUsed(qrPayload.n);
    }

    // All checks passed
    return { 
      valid: true, 
      reason: 'Verified offline successfully', 
      prescription: cached 
    };

  } catch (error) {
    console.error('Offline verification error:', error);
    return { valid: false, reason: `Verification error: ${error.message}`, prescription: null };
  }
}

export default {
  verifyOfflineSignature,
  verifyAgainstCache,
  isNonceUsed,
  markNonceAsUsed,
  performOfflineVerification
};

