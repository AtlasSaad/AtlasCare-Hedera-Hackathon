/**
 * CNDP Law 09-08 and HIPAA Compliance Tests
 * Validates that HCS payloads contain NO quasi-identifiers or PII
 */

const { compressPayload } = require('../utils/hcsPayloadCompressor');
const { compressGeotag } = require('../utils/geotagMapper');

// Initialize hashLookup at module level for all tests
let hashLookup;

beforeEach(() => {
  hashLookup = new Map();
});

describe('CNDP Law 09-08 Compliance', () => {

  describe('Article 1: Data Minimization', () => {
    test('should minimize data in HCS messages', () => {
      const fullPayload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc123',
        drugIds: ['C01AA05'],
        instructionsList: ['Take 2x/day'],
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'nonce',
        signature: 'hex:sig',
        version: '1',
        alg: 'secp256k1+SHA-256'
      };

      const compressed = compressPayload(fullPayload, hashLookup);
      const jsonStr = JSON.stringify(compressed);

      // Verify no unnecessary metadata
      expect(jsonStr).not.toContain('version');
      expect(jsonStr).not.toContain('alg');
      expect(jsonStr).not.toContain('signerRole');
      expect(jsonStr).not.toContain('contentHash');
      expect(jsonStr).not.toContain('keyId');
    });
  });

  describe('Article 4: Health Data Protection', () => {
    test('should NOT include detailed drug information in HCS', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        drugIds: ['C01AA05', 'N02BE01', 'A10BA02'], // Multiple drugs = quasi-identifier
        instructionsList: ['HIV medication', 'Diabetes insulin'], // Reveals conditions
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Verify sensitive health data removed
      expect(compressed.drugIds).toBeUndefined();
      expect(compressed.instructionsList).toBeUndefined();
      
      // Only hashed patient ID allowed
      expect(compressed.h).toBeDefined();
      expect(compressed.h).not.toContain('sha256:'); // Prefix removed
    });

    test('should use city-level geotags only (not precise coordinates)', () => {
      const preciseGeotag = '33.5731,-7.5898';
      const cityCode = compressGeotag(preciseGeotag);

      // Verify converted to city code
      expect(cityCode).toMatch(/^MA-[A-Z]{3}$/);
      expect(cityCode).not.toContain(','); // No coordinates
      expect(cityCode).not.toContain('.'); // No decimal precision
    });
  });

  describe('CNDP Article 24: Right to be Forgotten', () => {
    test('should support right to be forgotten via hash lookup deletion', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Patient ID is hashed and truncated
      expect(compressed.h).toHaveLength(8);
      expect(hashLookup.has(compressed.h)).toBe(true);

      // Simulate "right to be forgotten": delete hash lookup
      hashLookup.delete(compressed.h);

      // HCS message becomes meaningless without lookup table
      expect(hashLookup.has(compressed.h)).toBe(false);
      
      // Note: HCS data persists but cannot be linked back to patient
      // This satisfies CNDP requirement: data is "forgotten" from perspective of linking
    });
  });
});

describe('HIPAA Safe Harbor De-identification', () => {
  describe('18 Identifiers Check', () => {
    test('should NOT contain names (identifier #1)', () => {
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

      const compressed = compressPayload(payload);
      const jsonStr = JSON.stringify(compressed);

      expect(jsonStr).not.toMatch(/name/i);
      expect(jsonStr).not.toMatch(/firstName/i);
      expect(jsonStr).not.toMatch(/lastName/i);
    });

    test('should NOT contain geographic subdivisions smaller than state (identifier #2)', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: '33.5731,-7.5898', // Precise coords - should be compressed
        hashedPatientId: 'sha256:abc',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload);

      // Geotag should be city-level code, not precise coordinates
      expect(compressed.g).toMatch(/^MA-[A-Z]{3}$/);
      expect(compressed.g).not.toContain('.'); // No decimal precision
    });

    test('should NOT contain dates except year (identifier #3)', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:30:45.123Z',
        validUntil: '2025-12-27T15:20:10.456Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:abc',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload);

      // Timestamps compressed to Unix epoch (numbers, not ISO strings)
      expect(typeof compressed.ts).toBe('number');
      expect(typeof compressed.u).toBe('number');

      // Verify no ISO date strings in output
      const jsonStr = JSON.stringify(compressed);
      expect(jsonStr).not.toMatch(/\d{4}-\d{2}-\d{2}/); // No YYYY-MM-DD
      expect(jsonStr).not.toMatch(/T\d{2}:\d{2}:\d{2}/); // No time component
    });

    test('should NOT contain telephone/fax numbers (identifier #4)', () => {
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

      const compressed = compressPayload(payload);
      const jsonStr = JSON.stringify(compressed);

      expect(jsonStr).not.toMatch(/phone/i);
      expect(jsonStr).not.toMatch(/fax/i);
      expect(jsonStr).not.toMatch(/mobile/i);
      expect(jsonStr).not.toMatch(/\+212/); // Morocco country code
    });

    test('should NOT contain email addresses (identifier #5)', () => {
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

      const compressed = compressPayload(payload);
      const jsonStr = JSON.stringify(compressed);

      expect(jsonStr).not.toMatch(/@/);
      expect(jsonStr).not.toMatch(/email/i);
    });

    test('should use hashed patient IDs only (identifiers #6-17)', () => {
      const payload = {
        eventType: 'issued',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:00:00.000Z',
        validUntil: '2025-12-27T12:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Only truncated hash allowed (8 hex chars)
      expect(compressed.h).toBeDefined();
      expect(compressed.h).toHaveLength(8);
      expect(compressed.h).toMatch(/^[0-9a-f]{8}$/);

      // No raw identifiers
      const jsonStr = JSON.stringify(compressed);
      expect(jsonStr).not.toMatch(/ssn/i);
      expect(jsonStr).not.toMatch(/socialSecurity/i);
      expect(jsonStr).not.toMatch(/nationalId/i);
      expect(jsonStr).not.toMatch(/license/i);
      expect(jsonStr).not.toMatch(/passport/i);
    });
  });

  describe('Minimum Necessary Rule', () => {
    test('should include only minimum necessary fields for audit', () => {
      const payload = {
        eventType: 'dispensed',
        topicID: '0.0.12345',
        timestamp: '2025-10-28T12:10:00.000Z',
        actorIdHash: 'sha256:pharmacist123',
        items: [
          { drugId: 'C01AA05', quantity: 30, unit: 'tablets', instructions: 'Patient-specific notes' }
        ],
        totals: { amountMAD: 150, coveredMAD: 120, patientMAD: 30 },
        prevEventHash: 'sha256:prev',
        dispenseCount: 1,
        maxDispenses: 1,
        nonce: 'n',
        signature: 'hex:s'
      };

      const compressed = compressPayload(payload, hashLookup);

      // Verify detailed items/totals removed (not necessary for audit trail)
      expect(compressed.items).toBeUndefined();
      expect(compressed.totals).toBeUndefined();

      // Only essential audit fields remain
      expect(compressed.dc).toBe(1); // Dispense count (essential)
      expect(compressed.md).toBe(1); // Max dispenses (essential)
      expect(compressed.e).toBe('d'); // Event type (essential)
      expect(compressed.t).toBeDefined(); // Topic ID (essential)
    });
  });
});

describe('Quasi-Identifier Detection', () => {
  test('should NOT allow rare drug combinations (quasi-identifier)', () => {
    const payload = {
      eventType: 'issued',
      topicID: '0.0.12345',
      timestamp: '2025-10-28T12:00:00.000Z',
      validUntil: '2025-12-27T12:00:00.000Z',
      geoTag: 'MA-CAS',
      hashedPatientId: 'sha256:abc',
      drugIds: ['L01XE03', 'L01XX35', 'L04AX01'], // Rare cancer drugs
      maxDispenses: 1,
      dispenseCount: 0,
      nonce: 'n',
      signature: 'hex:s'
    };

    const compressed = compressPayload(payload, hashLookup);

    // Drug IDs removed - would be quasi-identifier in small town
    expect(compressed.drugIds).toBeUndefined();
  });

  test('should NOT allow precise timestamps in small populations', () => {
    const payload = {
      eventType: 'issued',
      topicID: '0.0.12345',
      timestamp: '2025-10-28T12:34:56.789Z', // Precise to millisecond
      validUntil: '2025-12-27T12:00:00.000Z',
      geoTag: 'MA-CAS',
      hashedPatientId: 'sha256:abc',
      maxDispenses: 1,
      dispenseCount: 0,
      nonce: 'n',
      signature: 'hex:s'
    };

    const compressed = compressPayload(payload, hashLookup);

    // Timestamp compressed to Unix epoch (second precision, not millisecond)
    expect(typeof compressed.ts).toBe('number');
    
    // Verify resolution is seconds, not milliseconds
    const tsString = compressed.ts.toString();
    expect(tsString.length).toBe(10); // Unix timestamp in seconds (10 digits)
  });
});

describe('Cost vs Compliance Trade-offs', () => {
  test('should achieve 70%+ size reduction while maintaining compliance', () => {
    const fullPayload = {
      version: '1',
      alg: 'secp256k1+SHA-256',
      eventType: 'dispensed',
      topicID: '0.0.12345',
      timestamp: '2025-10-28T12:10:00.000Z',
      signerRole: 'pharmacist',
      actorIdHash: 'sha256:b2e4c1d5a8f7b3e9c6d2a5f8b1e4c7d0',
      items: [
        { drugId: 'C01AA05', quantity: 30, unit: 'tablets' },
        { drugId: 'N02BE01', quantity: 20, unit: 'tablets' }
      ],
      totals: { amountMAD: 150, coveredMAD: 120, patientMAD: 30 },
      paymentMethod: 'cash',
      prevEventHash: 'sha256:c1d5e7a1f4b8c2d6e9a3f7b0c4d8e1a5',
      dispenseCount: 1,
      maxDispenses: 1,
      nonce: 'nonce123456',
      contentHash: 'sha256:xyz123',
      keyId: 'fp:key123',
      signature: 'hex:304502210...'
    };

    const compressed = compressPayload(fullPayload, hashLookup);
    
    const originalSize = JSON.stringify(fullPayload).length;
    const compressedSize = JSON.stringify(compressed).length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100);

    // Verify cost savings
    expect(reduction).toBeGreaterThan(70);

    // Verify compliance maintained
    expect(compressed.items).toBeUndefined(); // Quasi-identifier removed
    expect(compressed.totals).toBeUndefined(); // Not necessary
    expect(compressed.version).toBeUndefined(); // Bloat removed
    expect(compressed.alg).toBeUndefined(); // Bloat removed
    expect(compressed.signerRole).toBeUndefined(); // Redundant
  });
});

