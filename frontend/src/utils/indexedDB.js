import CryptoJS from 'crypto-js';

const DB_NAME = 'AtlasCareDB';
const DB_VERSION = 2;
const STORE_NAMES = {
  PRESCRIPTIONS: 'prescriptions',
  OFFLINE_QUEUE: 'offlineQueue',
  CACHED_DRUGS: 'cachedDrugs',
  USED_NONCES: 'usedNonces',
  ENCRYPTED_STORAGE: 'encryptedStorage',
  DOCTORS: 'doctors'
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.encryptionKey = 'atlas-care-encryption-key-2025';
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create prescriptions store
        if (!db.objectStoreNames.contains(STORE_NAMES.PRESCRIPTIONS)) {
          const prescriptionStore = db.createObjectStore(STORE_NAMES.PRESCRIPTIONS, { keyPath: 'id' });
          prescriptionStore.createIndex('topicId', 'topicId', { unique: false });
          prescriptionStore.createIndex('patientHash', 'patientHash', { unique: false });
          prescriptionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create offline queue store
        if (!db.objectStoreNames.contains(STORE_NAMES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORE_NAMES.OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
          queueStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        // Create cached drugs store
        if (!db.objectStoreNames.contains(STORE_NAMES.CACHED_DRUGS)) {
          const drugsStore = db.createObjectStore(STORE_NAMES.CACHED_DRUGS, { keyPath: 'code' });
          drugsStore.createIndex('name', 'name', { unique: false });
          drugsStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Create used nonces store
        if (!db.objectStoreNames.contains(STORE_NAMES.USED_NONCES)) {
          db.createObjectStore(STORE_NAMES.USED_NONCES, { keyPath: 'nonce' });
        }

        // Create encrypted storage store
        if (!db.objectStoreNames.contains(STORE_NAMES.ENCRYPTED_STORAGE)) {
          db.createObjectStore(STORE_NAMES.ENCRYPTED_STORAGE, { keyPath: 'key' });
        }

        // Create doctors store for public key caching
        if (!db.objectStoreNames.contains(STORE_NAMES.DOCTORS)) {
          const doctorsStore = db.createObjectStore(STORE_NAMES.DOCTORS, { keyPath: 'doctorIdHash' });
          doctorsStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // AES-256 encryption/decryption
  encrypt(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
  }

  decrypt(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Generic store operations
  async addToStore(storeName, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Encrypt sensitive data
    const encryptedData = {
      ...data,
      encrypted: this.encrypt(data)
    };

    return new Promise((resolve, reject) => {
      const request = store.add(encryptedData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFromStore(storeName, key) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.encrypted) {
          const decrypted = this.decrypt(request.result.encrypted);
          resolve(decrypted);
        } else {
          resolve(request.result);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromStore(storeName) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map(item => {
          if (item.encrypted) {
            return this.decrypt(item.encrypted);
          }
          return item;
        }).filter(Boolean);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateInStore(storeName, key, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    const encryptedData = {
      ...data,
      encrypted: this.encrypt(data)
    };

    return new Promise((resolve, reject) => {
      const request = store.put(encryptedData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFromStore(storeName, key) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Prescription-specific methods
  async savePrescription(prescription) {
    return this.addToStore(STORE_NAMES.PRESCRIPTIONS, {
      ...prescription,
      timestamp: Date.now()
    });
  }

  async getPrescription(id) {
    return this.getFromStore(STORE_NAMES.PRESCRIPTIONS, id);
  }

  async getPrescriptionByTopicId(topicId) {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.PRESCRIPTIONS], 'readonly');
    const store = transaction.objectStore(STORE_NAMES.PRESCRIPTIONS);
    const index = store.index('topicId');

    return new Promise((resolve, reject) => {
      const request = index.get(topicId);
      request.onsuccess = () => {
        if (request.result && request.result.encrypted) {
          const decrypted = this.decrypt(request.result.encrypted);
          resolve(decrypted);
        } else {
          resolve(request.result);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPrescriptions() {
    return this.getAllFromStore(STORE_NAMES.PRESCRIPTIONS);
  }

  async getLast500Prescriptions() {
    const allPrescriptions = await this.getAllPrescriptions();
    return allPrescriptions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 500);
  }

  // Offline queue methods
  async addToOfflineQueue(item) {
    return this.addToStore(STORE_NAMES.OFFLINE_QUEUE, {
      ...item,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  async getOfflineQueue() {
    return this.getAllFromStore(STORE_NAMES.OFFLINE_QUEUE);
  }

  async removeFromOfflineQueue(id) {
    return this.deleteFromStore(STORE_NAMES.OFFLINE_QUEUE, id);
  }

  async updateRetryCount(id, retryCount) {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.OFFLINE_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.OFFLINE_QUEUE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const item = getRequest.result;
          item.retryCount = retryCount;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Drug cache methods
  async cacheDrugs(drugs) {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.CACHED_DRUGS], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.CACHED_DRUGS);

    // Clear existing cache
    await store.clear();

    // Add new drugs
    for (const drug of drugs) {
      await store.add({
        ...drug,
        lastUpdated: Date.now()
      });
    }
  }

  async getCachedDrugs() {
    return this.getAllFromStore(STORE_NAMES.CACHED_DRUGS);
  }

  async searchDrugs(query) {
    const allDrugs = await this.getCachedDrugs();
    const normalizedQuery = query.toLowerCase();
    
    return allDrugs.filter(drug => 
      drug.name.toLowerCase().includes(normalizedQuery) ||
      drug.code.toLowerCase().includes(normalizedQuery)
    ).slice(0, 10);
  }

  // Nonce tracking methods
  async addUsedNonce(nonce) {
    return this.addToStore(STORE_NAMES.USED_NONCES, { nonce, timestamp: Date.now() });
  }

  async isNonceUsed(nonce) {
    const result = await this.getFromStore(STORE_NAMES.USED_NONCES, nonce);
    return !!result;
  }

  async cleanupOldNonces() {
    const db = await this.ensureDB();
    const transaction = db.transaction([STORE_NAMES.USED_NONCES], 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.USED_NONCES);

    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result;
        const itemsToDelete = items.filter(item => item.timestamp < cutoffTime);
        
        let deleteCount = 0;
        if (itemsToDelete.length === 0) {
          resolve(0);
          return;
        }

        itemsToDelete.forEach(item => {
          const deleteRequest = store.delete(item.nonce);
          deleteRequest.onsuccess = () => {
            deleteCount++;
            if (deleteCount === itemsToDelete.length) {
              resolve(deleteCount);
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data (for testing/debugging)
  async clearAll() {
    const db = await this.ensureDB();
    const transaction = db.transaction(Object.values(STORE_NAMES), 'readwrite');
    
    for (const storeName of Object.values(STORE_NAMES)) {
      await transaction.objectStore(storeName).clear();
    }
  }
}

// Create singleton instance
const indexedDBManager = new IndexedDBManager();

export default indexedDBManager;
