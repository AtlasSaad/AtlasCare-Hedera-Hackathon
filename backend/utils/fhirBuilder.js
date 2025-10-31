/**
 * Builds a FHIR-compliant prescription (MedicationRequest resource)
 * @param {Object} data - The prescription data
 * @returns {Object} - FHIR MedicationRequest resource
 */
const crypto = require('crypto');

function canonicalize(obj) {
  // Minimal stable stringify for hashing (keys sorted)
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function buildFHIRPrescription(data) {
  const { 
    prescriptionId,
    patientId,
    patientName,
    patientEmail,
    age,
    diagnosis,
    medications,
    doctor,
    date
  } = data;

  // Format medications for FHIR
  const medicationRequests = medications.map((med, index) => ({
    resourceType: 'MedicationRequest',
    id: `${prescriptionId}-${index}`,
    status: 'active',
    intent: 'order',
    subject: {
      reference: `Patient/${patientId || 'unknown'}`,
      display: patientName
    },
    authoredOn: date || new Date().toISOString(),
    requester: {
      display: doctor || 'Unknown Doctor'
    },
    medicationCodeableConcept: {
      text: med.name,
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: med.code || 'N/A',
          display: med.name
        }
      ]
    },
    dosageInstruction: [
      {
        text: `${med.dosage} ${med.unit} ${med.frequency}`,
        timing: {
          repeat: {
            frequency: med.frequency ? parseInt(med.frequency) : 1,
            period: 1,
            periodUnit: 'd'
          }
        },
        route: {
          text: med.route || 'Oral'
        },
        doseAndRate: [
          {
            doseQuantity: {
              value: med.dosage ? parseFloat(med.dosage) : 1,
              unit: med.unit || 'tablet',
              system: 'http://unitsofmeasure.org',
              code: med.unit === 'ml' ? 'mL' : '{tablet}'
            }
          }
        ]
      }
    ],
    note: [
      {
        text: `Diagnosis: ${diagnosis || 'Not specified'}`
      }
    ]
  }));

  // Create a FHIR Bundle containing all medication requests
  const bundle = {
    resourceType: 'Bundle',
    id: prescriptionId,
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: medicationRequests.map(med => ({
      resource: med
    }))
  };

  // Compute contentHash for on-chain binding
  try {
    const canonical = canonicalize(bundle);
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');
    bundle.meta = { ...(bundle.meta || {}), tag: [{ system: 'https://atlascare.io/content-hash', code: `sha256:${hash}` }] };
    bundle._contentHash = `sha256:${hash}`; // transient helper for server-side use (not standard FHIR)
  } catch (_) {}

  return bundle;
}

module.exports = {
  buildFHIRPrescription
};
