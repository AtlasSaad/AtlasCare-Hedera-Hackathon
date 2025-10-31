/**
 * Tests for Verification Logic with Compressed Payloads
 * Ensures verification endpoint properly handles compressed HCS messages
 */

const { compressPayload, decompressPayload } = require('../utils/hcsPayloadCompressor');

describe('Verification Logic with Compression', () => {
  let hashLookup;

  beforeEach(() => {
    hashLookup = new Map();
  });

  describe('Payload Detection and Decompression', () => {
    test('should detect compressed payload by presence of e/t fields', () => {
      const compressedPayload = {
        e: 'i',
        t: '0.0.12345',
        ts: 1730073600,
        u: 1735344000,
        g: 'MA-CAS',
        h: 'a7f3c2d1',
        md: 1,
        dc: 0,
        n: 'abc123',
        s: 'hex:sig'
      };

      // Check detection logic (same as in backend/index.js verification)
      const isCompressed = (compressedPayload?.e || compressedPayload?.t) && 
                          !compressedPayload?.eventType && 
                          !compressedPayload?.topicID;

      expect(isCompressed).toBe(true);
    });

    test('should NOT detect full payload as compressed', () => {
      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'abc123',
        signature: 'hex:sig'
      };

      const isCompressed = ((fullPayload?.e || fullPayload?.t) && 
                          !fullPayload?.eventType && 
                          !fullPayload?.topicID) || false;

      expect(isCompressed).toBe(false);
    });

    test('should decompress payload and restore full format', () => {
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

      // Compress then decompress
      const compressed = compressPayload(original, hashLookup);
      const decompressed = decompressPayload(compressed, hashLookup);

      // Verify critical fields restored
      expect(decompressed.eventType).toBe('issued');
      expect(decompressed.topicID).toBe('0.0.12345');
      expect(decompressed.maxDispenses).toBe(2);
      expect(decompressed.dispenseCount).toBe(0);
      expect(decompressed.timestamp).toBeDefined();
      expect(decompressed.validUntil).toBeDefined();
    });
  });

  describe('Verification Field Validation', () => {
    test('should validate dispense count after decompression', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        maxDispenses: 2,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      // Compress
      const compressed = compressPayload(payload, hashLookup);
      
      // Decompress
      const decompressed = decompressPayload(compressed, hashLookup);

      // Validation logic (same as backend/index.js lines 751-759)
      const dc = decompressed.dc || decompressed.dispenseCount || 0;
      const md = decompressed.md || decompressed.maxDispenses || 1;
      const isFullyDispensed = dc >= md;

      expect(isFullyDispensed).toBe(false);
      expect(dc).toBe(0);
      expect(md).toBe(2);
    });

    test('should detect fully dispensed prescription after decompression', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        maxDispenses: 2,
        dispenseCount: 2, // Fully dispensed
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);
      const decompressed = decompressPayload(compressed, hashLookup);

      const dc = decompressed.dc || decompressed.dispenseCount || 0;
      const md = decompressed.md || decompressed.maxDispenses || 1;
      const isFullyDispensed = dc >= md;

      expect(isFullyDispensed).toBe(true);
    });

    test('should validate expiration after decompression', () => {
      // Create a prescription that expires in 30 days
      const now = new Date();
      const future = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: now.toISOString(),
        validUntil: future.toISOString(),
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      // Compress and decompress
      const compressed = compressPayload(payload, hashLookup);
      const decompressed = decompressPayload(compressed, hashLookup);

      // Verify validUntil field exists after decompression
      expect(decompressed.validUntil).toBeDefined();
      
      // Parse the validUntil date
      const validDate = new Date(decompressed.validUntil);
      const checkTime = new Date();
      
      // Verify it's a valid date and in the future
      expect(validDate.toString()).not.toBe('Invalid Date');
      expect(validDate.getTime()).toBeGreaterThan(checkTime.getTime());
      
      // Verify it's approximately 30 days from now (allowing for compression rounding to seconds)
      const expectedDays = 30;
      const actualDays = (validDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      expect(actualDays).toBeGreaterThan(expectedDays - 1); // Allow 1 day margin for rounding
      expect(actualDays).toBeLessThan(expectedDays + 1);
    });
  });

  describe('Mirror Node Decompression', () => {
    test('should handle compressed message from Mirror Node', () => {
      // Simulate compressed message from Mirror Node (base64 encoded)
      const compressedPayload = {
        e: 'i',
        t: '0.0.12345',
        ts: 1730073600,
        u: 1735344000,
        g: 'MA-CAS',
        h: 'a7f3c2d1',
        md: 1,
        dc: 0,
        n: 'abc123',
        s: 'sig'
      };

      const jsonString = JSON.stringify(compressedPayload);
      const base64 = Buffer.from(jsonString).toString('base64');

      // Simulate Mirror Node query response processing
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      let parsed = JSON.parse(decoded);

      // Check if compressed
      const isCompressed = (parsed?.e || parsed?.t) && !parsed?.eventType && !parsed?.topicID;
      expect(isCompressed).toBe(true);

      // Decompress
      if (isCompressed) {
        parsed = decompressPayload(parsed, hashLookup);
      }

      expect(parsed.eventType).toBe('issued');
      expect(parsed.topicID).toBe('0.0.12345');
    });

    test('should handle full (uncompressed) message from Mirror Node', () => {
      // Simulate old uncompressed message
      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z'
      };

      const jsonString = JSON.stringify(fullPayload);
      const base64 = Buffer.from(jsonString).toString('base64');

      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      let parsed = JSON.parse(decoded);

      // Check if compressed (with fallback to false)
      const isCompressed = ((parsed?.e || parsed?.t) && !parsed?.eventType && !parsed?.topicID) || false;
      expect(isCompressed).toBe(false);

      // Should not decompress
      expect(parsed.eventType).toBe('issued');
      expect(parsed.topicID).toBe('0.0.12345');
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle both compressed and uncompressed payloads in same system', () => {
      const compressedPayload = {
        e: 'i',
        t: '0.0.12345',
        ts: 1730073600,
        md: 1,
        dc: 0
      };

      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.67890',
        timestamp: '2025-10-28T12:00:00.000Z',
        maxDispenses: 1,
        dispenseCount: 0
      };

      // Process compressed
      const isCompressed1 = (compressedPayload?.e || compressedPayload?.t) && 
                           !compressedPayload?.eventType && !compressedPayload?.topicID;
      const processed1 = isCompressed1 ? decompressPayload(compressedPayload, hashLookup) : compressedPayload;

      // Process full
      const isCompressed2 = (fullPayload?.e || fullPayload?.t) && 
                           !fullPayload?.eventType && !fullPayload?.topicID;
      const processed2 = isCompressed2 ? decompressPayload(fullPayload, hashLookup) : fullPayload;

      // Both should have eventType
      expect(processed1.eventType).toBe('issued');
      expect(processed2.eventType).toBe('issued');
    });
  });

  describe('Hash Lookup Restoration', () => {
    test('should restore full hashes using lookup table', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6e9b2a5f8c1d4e7b0a3f6c9d2e5b8a1f4',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      // Compress (stores hash in lookup)
      const compressed = compressPayload(payload, hashLookup);
      
      // Verify hash was truncated
      expect(compressed.h).toHaveLength(8);
      
      // Verify lookup table has full hash
      expect(hashLookup.has(compressed.h)).toBe(true);
      
      // Decompress (restores hash from lookup)
      const decompressed = decompressPayload(compressed, hashLookup);
      
      // Verify hash was restored
      expect(decompressed.hashedPatientId).toBeDefined();
      expect(decompressed.hashedPatientId).toContain('sha256:');
    });
  });
});

