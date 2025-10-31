// Encrypted storage using IndexedDB with AES-GCM (256-bit) via Web Crypto API
// Key derivation: PBKDF2 from a per-session secret derived from auth token
// NOTE: Do not store sensitive PII unless strictly required; this is a best-effort local encryption.

import indexedDBManager from './indexedDB';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const NS = 'atlascare:'; // prefix namespace
const SALT = TEXT_ENCODER.encode('atlascare-local-salt-v1');
const STORE_NAME = 'encryptedStorage';

async function getBaseKey() {
  // Use auth token if present; otherwise a volatile session secret
  let secret = localStorage.getItem('auth_token') || sessionStorage.getItem('atlascare_session_secret');
  if (!secret) {
    secret = crypto.getRandomValues(new Uint8Array(16));
    secret = btoa(String.fromCharCode(...secret));
    sessionStorage.setItem('atlascare_session_secret', secret);
  }
  return await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
}

async function getAesKey() {
  const baseKey = await getBaseKey();
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64) {
  const binStr = atob(b64);
  const arr = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
  return arr.buffer;
}

export async function setItem(key, value) {
  try {
    await indexedDBManager.ensureDB();
    const json = JSON.stringify(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await getAesKey();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      TEXT_ENCODER.encode(json)
    );
    const payload = {
      v: 1,
      iv: toBase64(iv),
      data: toBase64(ciphertext),
    };
    
    // Store in IndexedDB
    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.put({ key: NS + key, value: JSON.stringify(payload), timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to store encrypted item:', error);
    // Fallback to localStorage
    const json = JSON.stringify(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await getAesKey();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      TEXT_ENCODER.encode(json)
    );
    const payload = {
      v: 1,
      iv: toBase64(iv),
      data: toBase64(ciphertext),
    };
    localStorage.setItem(NS + key, JSON.stringify(payload));
  }
}

export async function getItem(key, defaultValue = null) {
  try {
    await indexedDBManager.ensureDB();
    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const result = await new Promise((resolve, reject) => {
      const request = store.get(NS + key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!result) {
      // Fallback to localStorage
      const raw = localStorage.getItem(NS + key);
      if (!raw) return defaultValue;
      return await decryptFromRaw(raw, defaultValue, key);
    }
    
    return await decryptFromRaw(result.value, defaultValue, key);
  } catch (error) {
    console.error('Failed to get encrypted item from IndexedDB:', error);
    // Fallback to localStorage
    const raw = localStorage.getItem(NS + key);
    if (!raw) return defaultValue;
    return await decryptFromRaw(raw, defaultValue, key);
  }
}

async function decryptFromRaw(raw, defaultValue, key = null) {
  try {
    if (!raw) return defaultValue;
    
    const payload = JSON.parse(raw);
    if (!payload || !payload.iv || !payload.data) {
      console.warn('Invalid encrypted payload structure, returning default');
      return defaultValue;
    }
    
    const iv = new Uint8Array(fromBase64(payload.iv));
    const data = fromBase64(payload.data);
    const aesKey = await getAesKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      data
    );
    const json = TEXT_DECODER.decode(new Uint8Array(plaintext));
    return JSON.parse(json);
  } catch (e) {
    // Decryption failed - likely due to key change or corrupted data
    // Clear the corrupted entry and return default value
    if (key) {
      console.warn(`Encrypted storage decryption failed for key "${key}" (key changed or corrupted data). Clearing entry.`);
      // Fire-and-forget cleanup - don't block the return
      removeItem(key).catch(() => {
        // If removal fails, try localStorage cleanup as fallback
        try {
          localStorage.removeItem(NS + key);
        } catch (_) {}
      });
    }
    return defaultValue;
  }
}

export async function removeItem(key) {
  try {
    await indexedDBManager.ensureDB();
    const db = await indexedDBManager.ensureDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(NS + key);
  } catch (error) {
    console.error('Failed to remove encrypted item from IndexedDB:', error);
    // Fallback to localStorage
    localStorage.removeItem(NS + key);
  }
}

export async function pushToArray(key, item, limit = 500) {
  const arr = (await getItem(key, [])) || [];
  arr.push(item);
  if (arr.length > limit) arr.shift();
  await setItem(key, arr);
  return arr;
}
