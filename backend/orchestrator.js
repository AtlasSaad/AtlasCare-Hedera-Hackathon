const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { buildFHIRPrescription } = require('./utils/fhirBuilder');
const { hashIdentifier } = require('./utils/privacy');
const { mintPrescriptionNFT, submitAuditMessage, storePrescription } = require('./hedera');
const logger = require('./utils/logger');

// For Step 2 MVP, we process synchronously and emit events.
// In Step 3, we can replace internals with BullMQ queues backed by Redis.
class Orchestrator extends EventEmitter {
  async issuePrescription({ formData, geo, doctorId }) {
    const start = Date.now();
    const prescriptionId = uuidv4();
    const nonce = uuidv4();
    const salt = process.env.CNDP_SALT || 'atlascare-default-salt';

    const patientHash = hashIdentifier(formData.patientId || formData.patientEmail || 'unknown', salt, nonce);
    const doctorHash = hashIdentifier(doctorId || 'doctor@example.com', salt, prescriptionId);
    const drugHashes = (formData.medications || []).map(m => hashIdentifier(m.code || m.name || 'unknown', salt, prescriptionId));

    // Build FHIR
    const fhirPrescription = buildFHIRPrescription({
      ...formData,
      prescriptionId,
      date: new Date().toISOString(),
      doctor: 'Dr. Smith'
    });

    // Mint NFT
    const drugCodes = (formData.medications || []).map(m => m.code || m.name).slice(0, 10);
    const metadata = {
      prescriptionId,
      drugCodes,
      timestamp: Date.now(),
      patientHash,
      doctorHash,
      drugHashes,
      contentHash: fhirPrescription._contentHash,
      geoTag: geo ? { lat: geo.lat, lng: geo.lng } : undefined
    };
    const nft = await mintPrescriptionNFT(metadata);

    // HCS audit moved to API layer (index.js) to use the hardened issuance payload schema

    // Store off-chain reference (demo)
    const stored = await storePrescription({ ...fhirPrescription, id: prescriptionId, nft });

    const duration = Date.now() - start;
    logger.info('workflow:issue-prescription', { prescriptionId, durationMs: duration, tokenId: nft.tokenId, serial: nft.serial });

    this.emit('workflow-complete', { prescriptionId, nft, stored });
    return { prescriptionId, nft, stored, patientHash, doctorHash, drugHashes };
  }
}

module.exports = new Orchestrator();
