import indexedDBManager from './indexedDB';

/**
 * Cache doctor's public key for offline verification
 * @param {String} doctorIdHash - Hashed doctor ID
 * @param {String} publicKeyHex - Doctor's public key (hex format)
 * @returns {Promise<void>}
 */
export async function cacheDoctorPublicKey(doctorIdHash, publicKeyHex) {
  try {
    if (!doctorIdHash || !publicKeyHex) {
      console.warn('Cannot cache doctor key: missing doctorIdHash or publicKeyHex');
      return;
    }

    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction(['doctors'], 'readwrite');
    const store = transaction.objectStore('doctors');

    const doctorData = {
      doctorIdHash,
      publicKeyHex,
      cachedAt: Date.now(),
      lastUsed: Date.now()
    };

    await new Promise((resolve, reject) => {
      const request = store.put(doctorData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('Doctor public key cached for offline verification:', doctorIdHash);
  } catch (error) {
    // If doctors store doesn't exist, create it dynamically
    if (error.message?.includes('doctors')) {
      console.warn('Doctors object store not found, will be created on next DB upgrade');
    } else {
      console.error('Failed to cache doctor public key:', error);
    }
  }
}

/**
 * Get cached doctor public key
 * @param {String} doctorIdHash - Hashed doctor ID
 * @returns {Promise<String|null>} - Public key hex or null
 */
export async function getCachedDoctorPublicKey(doctorIdHash) {
  try {
    if (!doctorIdHash) {
      return null;
    }

    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction(['doctors'], 'readonly');
    const store = transaction.objectStore('doctors');

    const doctorData = await new Promise((resolve, reject) => {
      const request = store.get(doctorIdHash);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (doctorData) {
      // Update last used timestamp
      updateDoctorKeyUsage(doctorIdHash).catch(err => 
        console.warn('Failed to update doctor key usage:', err)
      );
      
      return doctorData.publicKeyHex;
    }

    return null;
  } catch (error) {
    if (error.message?.includes('doctors')) {
      console.warn('Doctors object store not found');
    } else {
      console.error('Failed to get cached doctor public key:', error);
    }
    return null;
  }
}

/**
 * Update last used timestamp for a doctor key
 * @param {String} doctorIdHash - Hashed doctor ID
 */
async function updateDoctorKeyUsage(doctorIdHash) {
  try {
    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction(['doctors'], 'readwrite');
    const store = transaction.objectStore('doctors');

    const doctorData = await new Promise((resolve, reject) => {
      const request = store.get(doctorIdHash);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (doctorData) {
      doctorData.lastUsed = Date.now();
      await new Promise((resolve, reject) => {
        const request = store.put(doctorData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  } catch (error) {
    // Silent fail - not critical
  }
}

/**
 * Clean up old doctor keys (older than 90 days)
 * @returns {Promise<number>} - Number of keys removed
 */
export async function cleanupOldDoctorKeys() {
  try {
    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction(['doctors'], 'readwrite');
    const store = transaction.objectStore('doctors');

    const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago

    const allKeys = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let deletedCount = 0;
    for (const doctorData of allKeys) {
      if (doctorData.lastUsed < cutoffTime) {
        await new Promise((resolve, reject) => {
          const request = store.delete(doctorData.doctorIdHash);
          request.onsuccess = () => {
            deletedCount++;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old doctor keys`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup old doctor keys:', error);
    return 0;
  }
}

/**
 * Cache prescription with doctor public key for offline access
 * @param {Object} prescription - Full prescription data
 * @param {String} doctorPublicKey - Doctor's public key
 */
export async function cachePrescriptionWithKey(prescription, doctorPublicKey) {
  try {
    // Cache the prescription in IndexedDB
    const prescriptionData = {
      ...prescription,
      doctorPublicKey, // Include public key with prescription
      cachedAt: Date.now()
    };

    await indexedDBManager.savePrescription(prescriptionData);

    // Also cache the doctor's public key separately
    if (prescription.doctorIdHash) {
      await cacheDoctorPublicKey(prescription.doctorIdHash, doctorPublicKey);
    }

    console.log('Prescription and doctor key cached for offline access');
  } catch (error) {
    console.error('Failed to cache prescription with key:', error);
  }
}

export default {
  cacheDoctorPublicKey,
  getCachedDoctorPublicKey,
  cleanupOldDoctorKeys,
  cachePrescriptionWithKey
};

