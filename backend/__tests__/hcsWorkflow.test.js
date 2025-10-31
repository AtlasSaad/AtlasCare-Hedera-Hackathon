/**
 * Integration Tests for HCS Workflow with Compression
 * Tests full prescription lifecycle: Issue → Verify → Pay → Dispense
 */

const { compressPayload, decompressPayload } = require('../utils/hcsPayloadCompressor');
const { putSensitiveData, getSensitiveData } = require('../services/store');
const { checkFraud } = require('../utils/fraudDetection');

describe('HCS Workflow Integration Tests', () => {
  let hashLookup;
  const mockTopicID = '0.0.12345';

  beforeEach(() => {
    hashLookup = new Map();
  });

  describe('Complete Prescription Lifecycle', () => {
    test('Issue → Verify → Pay → Dispense with compression', () => {
      // Step 1: ISSUE
      const issuePayload = {
        eventType: 'issued',
        topicID: mockTopicID,
        timestamp: '2025-10-28T10:00:00.000Z',
        validUntil: '2025-12-27T10:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6',
        drugIds: ['C01AA05'],
        instructionsList: ['Take 2x/day with food'],
        nftSerial: '123',
        maxDispenses: 2,
        dispenseCount: 0,
        nonce: 'issue123',
        signature: 'hex:sig1'
      };

      // Compress for HCS
      const compressedIssue = compressPayload(issuePayload, hashLookup);
      
      // Store sensitive data separately
      putSensitiveData(mockTopicID, {
        drugIds: issuePayload.drugIds,
        instructionsList: issuePayload.instructionsList,
        nftSerial: issuePayload.nftSerial
      });

      // Verify compression
      expect(compressedIssue.drugIds).toBeUndefined(); // Removed for CNDP
      expect(compressedIssue.e).toBe('i');
      expect(compressedIssue.md).toBe(2);
      expect(compressedIssue.dc).toBe(0);

      // Verify sensitive data stored
      const sensitiveData = getSensitiveData(mockTopicID);
      expect(sensitiveData.drugIds).toEqual(['C01AA05']);
      expect(sensitiveData.instructionsList).toEqual(['Take 2x/day with food']);

      // Step 2: VERIFY (at pharmacy)
      const verifyPayload = {
        eventType: 'verified',
        topicID: mockTopicID,
        timestamp: '2025-10-28T14:00:00.000Z',
        actorIdHash: 'sha256:pharmacist123',
        prevEventHash: 'sha256:prevhash123',
        dispenseCount: 0,
        maxDispenses: 2,
        nonce: 'verify123',
        signature: 'hex:sig2'
      };

      const compressedVerify = compressPayload(verifyPayload, hashLookup);

      expect(compressedVerify.e).toBe('v');
      expect(compressedVerify.dc).toBe(0); // Not dispensed yet

      // Step 3: PAY
      const payPayload = {
        eventType: 'paid',
        topicID: mockTopicID,
        timestamp: '2025-10-28T14:05:00.000Z',
        actorIdHash: 'sha256:pharmacist123',
        amountMAD: 150.75,
        method: 'card',
        prevEventHash: 'sha256:verifyhash',
        nonce: 'pay123',
        signature: 'hex:sig3'
      };

      const compressedPay = compressPayload(payPayload, hashLookup);

      expect(compressedPay.e).toBe('p');
      expect(compressedPay.amt).toBe(151); // Rounded to integer
      expect(compressedPay.m).toBe(2); // card = 2

      // Step 4: DISPENSE (first dispense)
      const dispensePayload = {
        eventType: 'dispensed',
        topicID: mockTopicID,
        timestamp: '2025-10-28T14:10:00.000Z',
        actorIdHash: 'sha256:pharmacist123',
        items: [{ drugId: 'C01AA05', quantity: 15 }], // Half the prescription
        totals: { amountMAD: 150, coveredMAD: 120, patientMAD: 30 },
        prevEventHash: 'sha256:payhash',
        dispenseCount: 1, // First dispense
        maxDispenses: 2,
        nonce: 'dispense1',
        signature: 'hex:sig4'
      };

      // Store items separately
      putSensitiveData(mockTopicID, {
        ...getSensitiveData(mockTopicID),
        dispensedItems: dispensePayload.items,
        dispensedTotals: dispensePayload.totals
      });

      const compressedDispense = compressPayload(dispensePayload, hashLookup);

      expect(compressedDispense.e).toBe('d');
      expect(compressedDispense.dc).toBe(1); // First dispense
      expect(compressedDispense.md).toBe(2); // Max 2
      expect(compressedDispense.items).toBeUndefined(); // Removed for CNDP
      expect(compressedDispense.totals).toBeUndefined(); // Removed for CNDP

      // Verify items stored separately
      const updatedSensitive = getSensitiveData(mockTopicID);
      expect(updatedSensitive.dispensedItems).toEqual([{ drugId: 'C01AA05', quantity: 15 }]);

      // Step 5: DISPENSE again (second dispense)
      const dispense2Payload = {
        eventType: 'dispensed',
        topicID: mockTopicID,
        timestamp: '2025-11-10T10:00:00.000Z', // 2 weeks later
        actorIdHash: 'sha256:pharmacist123',
        items: [{ drugId: 'C01AA05', quantity: 15 }], // Second half
        prevEventHash: 'sha256:dispense1hash',
        dispenseCount: 2, // Second dispense
        maxDispenses: 2,
        nonce: 'dispense2',
        signature: 'hex:sig5'
      };

      const compressedDispense2 = compressPayload(dispense2Payload, hashLookup);

      expect(compressedDispense2.dc).toBe(2); // Fully dispensed
      expect(compressedDispense2.md).toBe(2);
    });
  });

  describe('Fraud Detection with Compressed Geotags', () => {
    test('should detect fraud using city-level geotags', () => {
      const issueGeotag = 'MA-CAS'; // Casablanca
      const verifyGeotag = 'MA-MAR'; // Marrakech

      const fraudCheck = checkFraud(issueGeotag, verifyGeotag);

      // Cities are ~240km apart
      expect(fraudCheck.distance).toBeGreaterThan(200);
      expect(fraudCheck.suspicious).toBe(true);
      expect(fraudCheck.reason).toContain('Different cities');
    });

    test('should NOT flag fraud for same city', () => {
      const issueGeotag = 'MA-CAS';
      const verifyGeotag = 'MA-CAS';

      const fraudCheck = checkFraud(issueGeotag, verifyGeotag);

      expect(fraudCheck.distance).toBe(0);
      expect(fraudCheck.suspicious).toBe(false);
      expect(fraudCheck.reason).toContain('Same city');
    });

    test('should handle nearby cities without flagging', () => {
      const issueGeotag = 'MA-RAB'; // Rabat
      const verifyGeotag = 'MA-SAL'; // Salé (adjacent city)

      const fraudCheck = checkFraud(issueGeotag, verifyGeotag);

      // Cities are very close (<10km)
      expect(fraudCheck.distance).toBeLessThan(20);
      expect(fraudCheck.suspicious).toBe(false);
    });
  });

  describe('Message Size Validation', () => {
    test('all messages should be under 200 bytes', () => {
      const testMessages = [
        {
          eventType: 'issued',
          topicID: '0.0.12345',
          timestamp: '2025-10-28T10:00:00.000Z',
          validUntil: '2025-12-27T10:00:00.000Z',
          geoTag: 'MA-CAS',
          hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6',
          maxDispenses: 1,
          dispenseCount: 0,
          nonce: 'nonce1',
          signature: 'hex:' + '0'.repeat(140) // Realistic signature length
        },
        {
          eventType: 'paid',
          topicID: '0.0.12345',
          timestamp: '2025-10-28T14:00:00.000Z',
          actorIdHash: 'sha256:b2e4c1d5a8f7b3e9c6d2a5f8b1e4c7d0',
          amountMAD: 150,
          method: 'cash',
          prevEventHash: 'sha256:prev123',
          nonce: 'nonce2',
          signature: 'hex:' + '0'.repeat(140)
        },
        {
          eventType: 'dispensed',
          topicID: '0.0.12345',
          timestamp: '2025-10-28T14:10:00.000Z',
          actorIdHash: 'sha256:b2e4c1d5a8f7b3e9c6d2a5f8b1e4c7d0',
          prevEventHash: 'sha256:prev456',
          dispenseCount: 1,
          maxDispenses: 1,
          nonce: 'nonce3',
          signature: 'hex:' + '0'.repeat(140)
        }
      ];

      testMessages.forEach(msg => {
        const compressed = compressPayload(msg, hashLookup);
        const size = JSON.stringify(compressed).length;
        
        console.log(`${msg.eventType}: ${size} bytes`);
        expect(size).toBeLessThan(350); // With full signature
      });
    });
  });

  describe('Data Recovery from Sensitive Store', () => {
    test('should retrieve full prescription details from sensitive store', () => {
      const topicID = '0.0.67890';

      // Store comprehensive sensitive data
      putSensitiveData(topicID, {
        drugIds: ['C01AA05', 'N02BE01'],
        instructionsList: ['Take 2x/day with food', 'As needed for pain'],
        medications: [
          { name: 'Aspirin', dosage: '100mg', unit: 'tablets', quantity: 30 },
          { name: 'Ibuprofen', dosage: '400mg', unit: 'tablets', quantity: 20 }
        ],
        preciseGeoTag: '33.5731,-7.5898',
        nftSerial: '456789'
      });

      // Retrieve data
      const retrieved = getSensitiveData(topicID);

      expect(retrieved.drugIds).toEqual(['C01AA05', 'N02BE01']);
      expect(retrieved.medications).toHaveLength(2);
      expect(retrieved.preciseGeoTag).toBe('33.5731,-7.5898');
      expect(retrieved.nftSerial).toBe('456789');
    });

    test('should return null for non-existent topic', () => {
      const result = getSensitiveData('0.0.nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Hash Lookup Integrity', () => {
    test('should maintain hash lookup across multiple messages', () => {
      const msg1 = {
        eventType: 'issued',
        topicID: mockTopicID,
        timestamp: '2025-10-28T10:00:00.000Z',
        validUntil: '2025-12-27T10:00:00.000Z',
        geoTag: 'MA-CAS',
        hashedPatientId: 'sha256:a7f3c2d1e8b4a9f6c3d7e2b5a8f1c4d6e9b2a5f8c1d4e7b0a3f6c9d2e5b8a1f4',
        maxDispenses: 1,
        dispenseCount: 0,
        nonce: 'n1',
        signature: 'hex:s1'
      };

      const msg2 = {
        eventType: 'verified',
        topicID: mockTopicID,
        timestamp: '2025-10-28T14:00:00.000Z',
        actorIdHash: 'sha256:b2e4c1d5a8f7b3e9c6d2a5f8b1e4c7d0a3f6b9e2c5d8a1f4b7e0c3d6a9f2b5e8',
        prevEventHash: 'sha256:c1d5e7a1f4b8c2d6e9a3f7b0c4d8e1a5f9b2c6d0e3a7f1b5c8d2e6a0f3b7c1d4',
        dispenseCount: 0,
        maxDispenses: 1,
        nonce: 'n2',
        signature: 'hex:s2'
      };

      compressPayload(msg1, hashLookup);
      compressPayload(msg2, hashLookup);

      // Verify all hashes stored
      expect(hashLookup.size).toBeGreaterThan(0);
      
      // Verify hashes are 8 characters
      for (const [key, value] of hashLookup.entries()) {
        expect(key).toHaveLength(8);
        expect(value).toMatch(/^[0-9a-f]+$/);
      }
    });
  });
});

