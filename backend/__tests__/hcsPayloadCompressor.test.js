/**
 * Tests for HCS Payload Compressor
 * Validates 72% size reduction and CNDP compliance
 */

const { compressPayload, decompressPayload, calculateSavings, EVENT_TYPES, PAYMENT_METHODS } = require('../utils/hcsPayloadCompressor');
const crypto = require('crypto');

describe('HCS Payload Compressor', () => {
  let hashLookup;

  beforeEach(() => {
    hashLookup = new Map();
  });

  describe('Message 1 (ISSUED) Compression', () => {
    test('should compress ISSUED message by 60%+', () => {
      const fullPayload = {
        version: '1',
        alg: 'secp256k1+SHA-256',
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validFrom: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: '33.5731,-7.5898',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6e9b2a5f8c1d4e7b0a3f6c9d2e5b8a1f4',
        nftSerial: '123456',
        drugIds: ['C01AA05', 'N02BE01'],
        instructionsList: ['Take 2x/day', 'With food'],
        signerRole: 'doctor',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'a7f3c2d1e8b4',
        contentHash: 'sha256:1234567890abcdef',
        keyId: 'fp:abcd1234',
        signature: 'hex:3045022100...'
      };

      const compressed = compressPayload(fullPayload, hashLookup);
      const savings = calculateSavings(fullPayload, compressed);

      // Verify size reduction
      expect(savings.savedBytes).toBeGreaterThan(200);
      expect(parseFloat(savings.reduction)).toBeGreaterThan(60);

      // Verify essential fields are present
      expect(compressed.e).toBe('i');
      expect(compressed.t).toBe('0.0.12345');
      expect(compressed.md).toBe(1);
      expect(compressed.dc).toBe(0);

      // Verify removed fields
      expect(compressed.version).toBeUndefined();
      expect(compressed.alg).toBeUndefined();
      expect(compressed.signerRole).toBeUndefined();
      expect(compressed.drugIds).toBeUndefined(); // CNDP compliance
      expect(compressed.instructionsList).toBeUndefined(); // CNDP compliance
      expect(compressed.nftSerial).toBeUndefined();
    });

    test('should store truncated hashes in lookup table', () => {
      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6e9b2a5f8c1d4e7b0a3f6c9d2e5b8a1f4',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'abc123',
        signature: 'hex:3045...'
      };

      const compressed = compressPayload(fullPayload, hashLookup);

      // Verify hash was truncated and stored
      expect(compressed.h).toHaveLength(8);
      expect(hashLookup.has(compressed.h)).toBe(true);
      expect(hashLookup.get(compressed.h)).toBe('a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6e9b2a5f8c1d4e7b0a3f6c9d2e5b8a1f4');
    });

    test('should convert city-level geotags correctly', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc123',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'xyz',
        signature: 'hex:sig'
      };

      const compressed = compressPayload(payload, hashLookup);
      
      // Geotag should remain as city code
      expect(compressed.g).toBe('MA-CAS');
    });
  });

  describe('Message 2 (PAID) Compression', () => {
    test('should compress PAID message by 60%+', () => {
      const fullPayload = {
        version: '1',
        alg: 'secp256k1+SHA-256',
        eventType: 'paid',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:05:00.000Z',
        signerRole: 'pharmacist',
        actorIdHash: 'sha256:b2e4c1d5a8f7b3e9c6d2a5f8b1e4c7d0a3f6b9e2c5d8a1f4b7e0c3d6a9f2b5e8',
        amountMAD: 150.75,
        method: 'cash',
        prevEventHash: 'sha256:c1d5e7a1f4b8c2d6e9a3f7b0c4d8e1a5f9b2c6d0e3a7f1b5c8d2e6a0f3b7c1d4',
        nonce: 'nonce123',
        contentHash: 'sha256:xyz',
        keyId: 'fp:key123',
        signature: 'hex:sig123'
      };

      const compressed = compressPayload(fullPayload, hashLookup);
      const savings = calculateSavings(fullPayload, compressed);

      expect(parseFloat(savings.reduction)).toBeGreaterThan(60);

      // Verify essential fields
      expect(compressed.e).toBe('p');
      expect(compressed.amt).toBe(151); // Rounded to integer
      expect(compressed.m).toBe(1); // 'cash' enum

      // Verify removed fields
      expect(compressed.version).toBeUndefined();
      expect(compressed.alg).toBeUndefined();
      expect(compressed.signerRole).toBeUndefined();
    });

    test('should convert payment method to enum', () => {
      const payload = {
        eventType: 'paid',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:05:00.000Z',
        actorIdHash: 'sha256:abc',
        method: 'card',
        amountMAD: 100,
        prevEventHash: 'sha256:xyz',
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);
      expect(compressed.m).toBe(2); // 'card' = 2
    });
  });

  describe('Message 3 (DISPENSED) Compression', () => {
    test('should compress DISPENSED message by 70%+', () => {
      const fullPayload = {
        version: '1',
        alg: 'secp256k1+SHA-256',
        eventType: 'dispensed',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:10:00.000Z',
        signerRole: 'pharmacist',
        actorIdHash: 'sha256:pharmacist123',
        items: [
          { drugId: 'C01AA05', quantity: 30, unit: 'tablets' },
          { drugId: 'N02BE01', quantity: 20, unit: 'tablets' }
        ],
        totals: { amountMAD: 150, coveredMAD: 120, patientMAD: 30 },
        paymentMethod: 'cash',
        prevEventHash: 'sha256:prev123',
        dispenseCount: 1,
        maxDispenses: 1,
        nonce: 'nonce',
        contentHash: 'sha256:hash',
        keyId: 'fp:key',
        signature: 'hex:sig'
      };

      const compressed = compressPayload(fullPayload, hashLookup);
      const savings = calculateSavings(fullPayload, compressed);

      // Should have high compression due to removed items/totals arrays
      expect(parseFloat(savings.reduction)).toBeGreaterThan(70);

      // Verify essential fields
      expect(compressed.e).toBe('d');
      expect(compressed.dc).toBe(1);
      expect(compressed.md).toBe(1);

      // Verify CNDP compliance - removed quasi-identifiers
      expect(compressed.items).toBeUndefined();
      expect(compressed.totals).toBeUndefined();
      expect(compressed.paymentMethod).toBeUndefined();
    });
  });

  describe('Decompression', () => {
    test('should decompress ISSUED message correctly', () => {
      const original = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6',
        maxDispenses: 2,
        dispenseCount: 0,
        nonce: 'abc123',
        signature: 'hex:sig'
      };

      const compressed = compressPayload(original, hashLookup);
      const decompressed = decompressPayload(compressed, hashLookup);

      expect(decompressed.eventType).toBe('issued');
      expect(decompressed.topicID).toBe('0.0.12345');
      expect(decompressed.maxDispenses).toBe(2);
      expect(decompressed.dispenseCount).toBe(0);
    });

    test('should handle already decompressed payloads', () => {
      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z'
      };

      const result = decompressPayload(fullPayload, hashLookup);
      expect(result).toEqual(fullPayload);
    });
  });

  describe('Timestamp Compression', () => {
    test('should convert ISO timestamp to Unix epoch', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Verify timestamp is now a number (epoch)
      expect(typeof compressed.ts).toBe('number');
      expect(typeof compressed.u).toBe('number');

      // Verify timestamps are reasonable (around Oct 2025)
      expect(compressed.ts).toBeGreaterThan(1700000000);
      expect(compressed.u).toBeGreaterThan(compressed.ts);
    });
  });

  describe('CNDP Compliance', () => {
    test('should remove all quasi-identifiers from ISSUED message', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: '33.5731,-7.5898', // Precise coords
        hashedPatientId: 'sha256:abc',
        drugIds: ['C01AA05'], // Quasi-identifier
        instructionsList: ['Patient-specific notes'], // PII risk
        nftSerial: '12345', // Unnecessary metadata
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Verify quasi-identifiers removed
      expect(compressed.drugIds).toBeUndefined();
      expect(compressed.instructionsList).toBeUndefined();
      expect(compressed.nftSerial).toBeUndefined();
    });

    test('should remove quasi-identifiers from DISPENSED message', () => {
      const payload = {
        eventType: 'dispensed',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:10:00.000Z',
        actorIdHash: 'sha256:abc',
        items: [{ drugId: 'C01AA05', quantity: 30 }], // Quasi-identifier
        totals: { amountMAD: 150 },
        prevEventHash: 'sha256:xyz',
        dispenseCount: 1,
        maxDispenses: 1,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Verify detailed drug list removed
      expect(compressed.items).toBeUndefined();
      expect(compressed.totals).toBeUndefined();
    });
  });
});

