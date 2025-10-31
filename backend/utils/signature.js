const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const inMemoryKeys = new Map(); // nationalId -> { privateKeyHex, publicKeyHex }

function getSalt() {
  return process.env.SIGNATURE_SALT || 'atlascare_secret';
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(Buffer.from(String(input))).digest();
}

function generateKeyPair(nationalId) {
  const salt = getSalt();
  const seed = sha256Hex(String(nationalId || '') + String(salt || ''));
  const priv = seed.slice(0, 32);
  const key = ec.keyFromPrivate(priv);
  const privateKeyHex = key.getPrivate('hex');
  const publicKeyHex = key.getPublic('hex');
  inMemoryKeys.set(nationalId, { privateKeyHex, publicKeyHex });
  return { privateKeyHex, publicKeyHex };
}

function ensureKeyPair(nationalId) {
  if (!inMemoryKeys.has(nationalId)) {
    return generateKeyPair(nationalId);
  }
  return inMemoryKeys.get(nationalId);
}

function canonicalize(obj) {
  // Stable stringify
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return JSON.stringify(out);
}

function signPayload(payloadObj, nationalId) {
  const { privateKeyHex } = ensureKeyPair(nationalId);
  const key = ec.keyFromPrivate(privateKeyHex, 'hex');
  const hash = crypto.createHash('sha256').update(Buffer.from(canonicalize(payloadObj))).digest();
  const sig = key.sign(hash, { canonical: true });
  return sig.toDER('hex');
}

function verifySignature(payloadObj, signatureHex, nationalId) {
  const pair = ensureKeyPair(nationalId);
  const pub = ec.keyFromPublic(pair.publicKeyHex, 'hex');
  const hash = crypto.createHash('sha256').update(Buffer.from(canonicalize(payloadObj))).digest();
  const sig = typeof signatureHex === 'string' ? signatureHex.replace(/^hex:/i, '') : signatureHex;
  return pub.verify(hash, sig);
}

module.exports = {
  inMemoryKeys,
  ensureKeyPair,
  generateKeyPair,
  signPayload,
  verifySignature
};


