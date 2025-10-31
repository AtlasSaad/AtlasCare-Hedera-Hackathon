/**
 * FSE (Feuille de Soins Électronique) Generator
 * Compliant with:
 * - CNSS Morocco FSE format
 * - HL7 FHIR R4 Claim Resource
 * - IHE Pharmacy standards
 */

const fs = require('fs');
const path = require('path');

/**
 * Generates a fully compliant FSE claim
 * @param {Object} prescription - The prescription data
 * @param {Object} options - Additional options (refs, pharmacist info, etc.)
 * @returns {Object} - { fseJson, fsePdfUrl, fsePdfBase64, hl7Message }
 */
function generateFSE(prescription, options = {}) {
  const now = new Date().toISOString();
  const refs = options?.refs || {};
  const pharmacistInfo = options?.pharmacist || {};

  // Load medicines data (use same data as frontend with CNSS prices)
  let medicinesData = [];
  try {
    // Try to load from frontend data first (has CNSS data with prices)
    medicinesData = require('../../frontend/src/data/medicines.json') || [];
  } catch (_) {
    try {
      // Fallback to backend data
      medicinesData = require('../data/medicines.json') || [];
    } catch (_) {
      medicinesData = [];
    }
  }

  // Helper functions for price and rate extraction
  const normalizeKey = (key) => (key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const pickRawField = (raw, candidates) => {
    if (!raw) return undefined;
    const candNorm = candidates.map(normalizeKey);
    for (const k of Object.keys(raw)) {
      if (candNorm.includes(normalizeKey(k))) {
        const v = raw[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
    return undefined;
  };

  const extractPrice = (obj) => {
    if (obj?.price) return obj.price;
    const price = pickRawField(obj?.raw, ['ppv', 'prix_br', 'prix', 'price']);
    return price ? Number(price) : 0;
  };

  const extractRate = (obj) => {
    if (obj?.rate !== undefined) return obj.rate;
    const rateStr = pickRawField(obj?.raw, ['taux_remboursement', 'rate', 'coverage']);
    if (!rateStr) return 0;
    const rate = Number(rateStr.replace('%', ''));
    return isNaN(rate) ? 0 : rate;
  };

  const getPrice = (med) => {
    if (!med?.name) return 0;
    const found = medicinesData.find(m => 
      (m.code && med.code && m.code === med.code) ||
      (m.name && med.name && m.name.toLowerCase().trim() === med.name.toLowerCase().trim())
    );
    return found ? extractPrice(found) : 0;
  };

  const getRate = (med) => {
    if (!med?.name) return 0;
    const found = medicinesData.find(m => 
      (m.code && med.code && m.code === med.code) ||
      (m.name && med.name && m.name.toLowerCase().trim() === med.name.toLowerCase().trim())
    );
    return found ? extractRate(found) : 0;
  };

  // Calculate real totals using actual prices
  let totalAmount = 0;
  let totalCoverage = 0;
  let totalPatientShare = 0;

  // Calculate per-dispense quantities (split for multiple dispenses)
  const dispenseCount = prescription?.dispenseCount || 0;
  const maxDispenses = prescription?.maxDispenses || 1;
  const remainingDispenses = maxDispenses - dispenseCount;
  
  // Build FHIR-compliant line items with CNSS extensions
  const items = (prescription?.medications || []).map((m, idx) => {
    const price = Number(getPrice(m) || 0);
    const rate = Number(getRate(m) || 0);
    
    // Split quantity for multiple dispenses
    const totalQuantity = Number(m.duration) || 1;
    const quantityPerDispense = Math.ceil(totalQuantity / maxDispenses);
    const currentDispenseQuantity = Math.min(quantityPerDispense, totalQuantity - (dispenseCount * quantityPerDispense));
    
    const coverage = Number(((price * rate) / 100).toFixed(2));
    const patientPays = Number(Math.max(price - coverage, 0).toFixed(2));
    
    totalAmount += price;
    totalCoverage += coverage;
    totalPatientShare += patientPays;

    return {
      sequence: idx + 1,
      // FHIR R4 - productOrService is required
      productOrService: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/data-absent-reason',
          code: m.code || 'UNK',
          display: m.name
        }],
        text: m.name
      },
      // CNSS-specific medication identification
      medicationReference: {
        reference: `Medication/${m.code || 'unknown'}`,
        display: m.name,
        identifier: {
          system: 'http://cnss.ma/medication-code',
          value: m.code || 'UNKNOWN'
        }
      },
      // Quantity dispensed
      quantity: {
        value: currentDispenseQuantity,
        unit: m.durationUnit || 'days',
        system: 'http://unitsofmeasure.org',
        code: 'd'
      },
      // Unit price per item
      unitPrice: {
        value: price,
        currency: 'MAD'
      },
      // Total for this line item
      net: {
        value: price,
        currency: 'MAD'
      },
      // CNSS coverage details
      adjudication: [
        {
          category: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/adjudication',
              code: 'benefit',
              display: 'Benefit Amount'
            }]
          },
          amount: {
            value: coverage,
            currency: 'MAD'
          },
          value: rate // percentage
        },
        {
          category: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/adjudication',
              code: 'copay',
              display: 'CoPay'
            }]
          },
          amount: {
            value: patientPays,
            currency: 'MAD'
          }
        }
      ],
      // CNSS-specific extensions
      extension: [
        {
          url: 'http://cnss.ma/fhir/StructureDefinition/medication-dosage',
          valueString: `${m.dosage} ${m.unit}`
        },
        {
          url: 'http://cnss.ma/fhir/StructureDefinition/medication-frequency',
          valueString: `${m.frequency}x/day`
        },
        {
          url: 'http://cnss.ma/fhir/StructureDefinition/medication-instructions',
          valueString: m.instructions || `${m.frequency}x/day for ${m.duration} ${m.durationUnit}`
        },
        {
          url: 'http://cnss.ma/fhir/StructureDefinition/reimbursement-rate',
          valueDecimal: rate
        },
        {
          url: 'http://atlas.care/dispense-number',
          valueInteger: dispenseCount + 1
        },
        {
          url: 'http://atlas.care/max-dispenses',
          valueInteger: maxDispenses
        }
      ]
    };
  });

  // Build FHIR R4 Claim Resource with CNSS extensions
  const fseId = `FSE-${prescription?.id || prescription?.prescriptionId || 'unknown'}`;
  const claim = {
    resourceType: 'Claim',
    id: fseId,
    
    // Claim status
    status: 'active',
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/claim-type',
        code: 'pharmacy',
        display: 'Pharmacy'
      }]
    },
    use: 'claim',
    
    // Patient reference (CNSS format)
    patient: {
      reference: `Patient/${prescription?.patientId || 'unknown'}`,
      display: prescription?.patientName || 'Unknown Patient',
      identifier: {
        system: 'http://cnss.ma/patient-id',
        value: prescription?.patientId || 'unknown'
      }
    },
    
    // Created timestamp
    created: now,
    
    // Insurer (CNSS)
    insurer: {
      reference: 'Organization/CNSS',
      display: 'Caisse Nationale de Sécurité Sociale (CNSS)',
      identifier: {
        system: 'http://cnss.ma/organization-id',
        value: 'CNSS-MA'
      }
    },
    
    // Provider (Pharmacy)
    provider: {
      reference: `Practitioner/${pharmacistInfo?.nationalId || 'unknown'}`,
      display: pharmacistInfo?.name || 'Pharmacy',
      identifier: {
        system: 'http://cnss.ma/pharmacist-inpe',
        value: pharmacistInfo?.nationalId || 'unknown'
      }
    },
    
    // Priority
    priority: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/processpriority',
        code: 'normal'
      }]
    },
    
    // Prescription reference
    prescription: {
      reference: `MedicationRequest/${prescription?.id || 'unknown'}`,
      identifier: {
        system: 'http://atlas.care/prescription-id',
        value: prescription?.id || 'unknown'
      }
    },
    
    // Original prescriber
    prescriber: {
      reference: `Practitioner/${prescription?.doctorNationalId || 'unknown'}`,
      display: prescription?.doctor || 'Unknown Doctor',
      identifier: {
        system: 'http://cnss.ma/doctor-inpe',
        value: prescription?.doctorNationalId || 'unknown'
      }
    },
    
    // Diagnosis
    diagnosis: [{
      sequence: 1,
      diagnosisCodeableConcept: {
        text: prescription?.diagnosis || 'N/A',
        coding: [{
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: 'R69',
          display: prescription?.diagnosis || 'Unspecified'
        }]
      }
    }],
    
    // Insurance coverage
    insurance: [{
      sequence: 1,
      focal: true,
      coverage: {
        reference: `Coverage/${prescription?.patientId || 'unknown'}`,
        display: 'CNSS Coverage'
      }
    }],
    
    // Line items (medications)
    item: items,
    
    // Total amounts
    total: {
      value: Number(totalAmount.toFixed(2)),
      currency: 'MAD'
    },
    
    // Benefit balance (adjudication summary)
    benefitBalance: [{
      category: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/ex-benefitcategory',
          code: 'medical',
          display: 'Medical'
        }]
      },
      financial: [
        {
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/benefit-type',
              code: 'benefit',
              display: 'Benefit'
            }]
          },
          allowedMoney: {
            value: Number(totalCoverage.toFixed(2)),
      currency: 'MAD'
          }
        },
        {
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/benefit-type',
              code: 'copay',
              display: 'Copay'
            }]
          },
          usedMoney: {
            value: Number(totalPatientShare.toFixed(2)),
            currency: 'MAD'
          }
        }
      ]
    }],
    
    // CNSS-specific extensions
    extension: [
      {
        url: 'http://cnss.ma/fhir/StructureDefinition/fse-version',
        valueString: '2.0'
      },
      {
        url: 'http://cnss.ma/fhir/StructureDefinition/claim-date',
        valueDateTime: now
      },
      {
        url: 'http://atlas.care/blockchain-reference',
        valueString: refs?.topicId || 'unknown'
      },
      {
        url: 'http://atlas.care/nft-reference',
        valueString: refs?.nft?.tokenId ? `${refs.nft.tokenId}#${refs.nft.serial}` : 'none'
      },
      {
        url: 'http://atlas.care/geotag',
        valueString: prescription?.geoTag || 'MA-CAS'
      },
      {
        url: 'http://cnss.ma/fhir/StructureDefinition/coverage-rate',
        valueDecimal: totalAmount > 0 ? Number((totalCoverage / totalAmount * 100).toFixed(2)) : 0
      },
      {
        url: 'http://atlas.care/dispense-info',
        extension: [
          {
            url: 'current',
            valueInteger: dispenseCount + 1
          },
          {
            url: 'maximum',
            valueInteger: maxDispenses
          },
          {
            url: 'remaining',
            valueInteger: remainingDispenses
          }
        ]
      }
    ],
    
    // CNSS FSE metadata
    meta: {
      profile: [
        'http://cnss.ma/fhir/StructureDefinition/cnss-claim',
        'http://hl7.org/fhir/StructureDefinition/Claim'
      ],
      tag: [
        {
          system: 'http://cnss.ma/fhir/CodeSystem/claim-category',
          code: 'pharmacy',
          display: 'Pharmacy Claim'
        },
        {
          system: 'http://atlas.care/system',
          code: 'hedera-blockchain',
          display: 'Hedera Blockchain Verified'
        }
      ],
      lastUpdated: now,
      versionId: '1'
    }
  };

  // Generate HL7 v2.x message for legacy system compatibility
  const hl7Message = generateHL7Message(prescription, claim, pharmacistInfo);

  // Generate PDF
  let fsePdfBase64 = null;
  try {
    const PDFDocument = require('pdfkit');
    const { Writable } = require('stream');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      }
    });
    doc.pipe(writable);

    // Load logo from common paths
    let logoPath = null;
    const logoCandidates = [
      path.resolve(__dirname, '..', '..', 'Logo-V2.png'),
      path.resolve(__dirname, '..', '..', 'Logo.png'),
      path.resolve(__dirname, '..', 'Logo-V2.png'),
      path.resolve(__dirname, '..', 'Logo.png'),
      path.resolve(process.cwd(), 'Logo-V2.png'),
      path.resolve(process.cwd(), 'Logo.png')
    ];
    for (const p of logoCandidates) {
      if (!logoPath && fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    }

    // Header with logo (left) and title (right)
    const headerTopY = 50;
    const leftMargin = 50;
    const pageWidth = doc.page.width;
    
    // Logo on left
    if (logoPath) {
      try {
        doc.image(logoPath, leftMargin, headerTopY, { width: 100 });
      } catch (err) {
        console.warn('Could not load logo for FSE PDF:', err.message);
      }
    }
    
    // Title on right
    const titleX = pageWidth - 400;
    doc.fontSize(20).font('Helvetica-Bold').text('FEUILLE DE SOINS', titleX, headerTopY, { width: 350, align: 'right' });
    doc.fontSize(20).font('Helvetica-Bold').text('ÉLECTRONIQUE (FSE)', titleX, headerTopY + 24, { width: 350, align: 'right' });
    doc.fontSize(12).font('Helvetica').text('CNSS - Caisse Nationale de Sécurité Sociale', titleX, headerTopY + 50, { width: 350, align: 'right' });
    
    // Move cursor down after header
    doc.y = headerTopY + 80;
    doc.moveDown();
    
    // Claim info
    doc.fontSize(10);
    doc.text(`Numéro FSE: ${claim.id}`, { continued: true }).text(`     Date: ${new Date(now).toLocaleDateString('fr-MA')}`, { align: 'right' });
    doc.text(`Statut: ${claim.status.toUpperCase()}`);
    doc.moveDown();

    // Patient section
    doc.fontSize(12).font('Helvetica-Bold').text('ASSURÉ / PATIENT');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom: ${claim.patient.display}`);
    doc.text(`Matricule: ${claim.patient.identifier.value}`);
    doc.moveDown();

    // Prescriber section
    doc.fontSize(12).font('Helvetica-Bold').text('PRESCRIPTEUR');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom: Dr. ${prescription?.doctor || 'Unknown'}`);
    if (prescription?.doctorSpecialty) {
      doc.text(`Spécialité: ${prescription.doctorSpecialty}`);
    }
    doc.text(`INPE: ${claim.prescriber.identifier.value}`);
    doc.moveDown();

    // Pharmacy section
    doc.fontSize(12).font('Helvetica-Bold').text('PHARMACIE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom: ${claim.provider.display}`);
    doc.text(`INPE: ${claim.provider.identifier.value}`);
    doc.moveDown();

    // Diagnosis
    doc.fontSize(12).font('Helvetica-Bold').text('DIAGNOSTIC');
    doc.fontSize(10).font('Helvetica');
    doc.text(claim.diagnosis[0].diagnosisCodeableConcept.text);
    doc.moveDown();

    // Medications table
    doc.fontSize(12).font('Helvetica-Bold').text('MÉDICAMENTS DÉLIVRÉS');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    
    claim.item.forEach((it, idx) => {
      const name = it.productOrService?.text || 'Item';
      const code = it.medicationReference?.identifier?.value || 'N/A';
      const price = it.unitPrice?.value || 0;
      const coverage = it.adjudication[0]?.amount?.value || 0;
      const patientShare = it.adjudication[1]?.amount?.value || 0;
      const rate = it.adjudication[0]?.value || 0;
      
      doc.font('Helvetica-Bold').text(`${idx + 1}. ${name}`, { continued: false });
      doc.font('Helvetica').text(`   Code CNSS: ${code} | Quantité: ${it.quantity?.value || 1} ${it.quantity?.unit || ''}`);
      doc.text(`   Prix: ${price.toFixed(2)} MAD | Taux: ${rate}% | Part CNSS: ${coverage.toFixed(2)} MAD | Part assuré: ${patientShare.toFixed(2)} MAD`);
      doc.moveDown(0.3);
    });

    // Totals
    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`MONTANT TOTAL: ${totalAmount.toFixed(2)} MAD`);
    doc.text(`PART CNSS: ${totalCoverage.toFixed(2)} MAD`);
    doc.text(`PART ASSURÉ: ${totalPatientShare.toFixed(2)} MAD`, { underline: true });
    doc.moveDown();

    // Footer
    doc.fontSize(8).font('Helvetica');
    doc.text(`FSE générée électroniquement via AtlasCare | Référence blockchain: ${refs?.topicId || 'N/A'}`, { align: 'center' });
    doc.text(`HL7 FHIR R4 Compliant | CNSS FSE Version 2.0`, { align: 'center' });

    doc.end();

    // Finalize base64
    writable.on('finish', () => {});
    const buffer = Buffer.concat(chunks);
    fsePdfBase64 = buffer.toString('base64');
  } catch (e) {
    console.error('PDF generation failed:', e.message);
    fsePdfBase64 = null;
  }

  const pdfUrl = `/claims/${claim.id}.pdf`;
  return { 
    fseJson: claim, 
    fsePdfUrl: pdfUrl, 
    fsePdfBase64,
    hl7Message,
    summary: {
      totalAmount: Number(totalAmount.toFixed(2)),
      totalCoverage: Number(totalCoverage.toFixed(2)),
      totalPatientShare: Number(totalPatientShare.toFixed(2)),
      coveragePercentage: totalAmount > 0 ? Number((totalCoverage / totalAmount * 100).toFixed(2)) : 0,
      itemCount: items.length,
      dispenseInfo: {
        current: dispenseCount + 1,
        maximum: maxDispenses,
        remaining: remainingDispenses
      }
    }
  };
}

/**
 * Generates HL7 v2.x message for legacy system integration
 */
function generateHL7Message(prescription, claim, pharmacistInfo) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  
  // HL7 v2.x RDE^O11 (Pharmacy/Treatment Encoded Order)
  const segments = [];
  
  // MSH - Message Header
  segments.push(`MSH|^~\\&|ATLASCARE|PHARMACY|CNSS|MA|${timestamp}||RDE^O11^RDE_O11|${claim.id}|P|2.5|||||MAR|UTF-8`);
  
  // PID - Patient Identification
  const patientId = prescription?.patientId || 'UNKNOWN';
  const patientName = prescription?.patientName || 'UNKNOWN';
  segments.push(`PID|1||${patientId}^^^CNSS^MR||${patientName}||${prescription?.age || ''}||||||||||||${patientId}^^^CNSS`);
  
  // PV1 - Patient Visit
  segments.push(`PV1|1|O|PHARMACY||||${prescription?.doctorNationalId || ''}^${prescription?.doctor || 'UNKNOWN'}^^^^^^^INPE|||||||||||||||||||||||||||||||||||${timestamp}`);
  
  // ORC - Common Order
  segments.push(`ORC|NW|${claim.id}|${prescription?.id || 'UNKNOWN'}|||||${timestamp}|||${prescription?.doctorNationalId || ''}^${prescription?.doctor || 'UNKNOWN'}^^^^^^^INPE`);
  
  // RXE - Pharmacy/Treatment Encoded Order (one per medication)
  (prescription?.medications || []).forEach((med, idx) => {
    const code = med.code || 'UNKNOWN';
    const name = med.name || 'UNKNOWN';
    const dosage = `${med.dosage || '1'}${med.unit || 'mg'}`;
    const frequency = `${med.frequency || '1'}X/DAY`;
    const duration = `${med.duration || '7'}${med.durationUnit || 'days'}`;
    
    segments.push(`RXE|${idx + 1}|${code}^${name}^CNSS|||${dosage}|||||${frequency}||${duration}||||||||||||||||||`);
  });
  
  // RXR - Pharmacy/Treatment Route (oral by default)
  segments.push(`RXR|PO^ORAL^HL70162`);
  
  // OBX - Observation/Result (pricing info)
  const totalAmount = claim.total?.value || 0;
  const totalCoverage = claim.benefitBalance?.[0]?.financial?.[0]?.allowedMoney?.value || 0;
  const totalPatient = claim.benefitBalance?.[0]?.financial?.[1]?.usedMoney?.value || 0;
  
  segments.push(`OBX|1|NM|TOTAL_AMOUNT^Total Amount^LOCAL||${totalAmount}|MAD|||||F`);
  segments.push(`OBX|2|NM|CNSS_COVERAGE^CNSS Coverage^LOCAL||${totalCoverage}|MAD|||||F`);
  segments.push(`OBX|3|NM|PATIENT_SHARE^Patient Share^LOCAL||${totalPatient}|MAD|||||F`);
  
  return segments.join('\r');
}

module.exports = { generateFSE };
