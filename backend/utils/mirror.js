const axios = require('axios');
const { decompressPayload } = require('./hcsPayloadCompressor');

const MIRROR = process.env.HEDERA_MIRROR_BASE || 'https://testnet.mirrornode.hedera.com/api/v1';

async function getNftMetadata(tokenId, serial) {
  const url = `${MIRROR}/tokens/${tokenId}/nfts/${serial}`;
  const { data } = await axios.get(url);
  // data.metadata is base64-encoded
  try {
    const jsonStr = Buffer.from(data.metadata, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

async function hasIssuedEvent(topicId, prescriptionId) {
  if (!topicId) return false;
  const url = `${MIRROR}/topics/${topicId}/messages?limit=25`;
  try {
    const { data } = await axios.get(url);
    const messages = data?.messages || [];
    for (const msg of messages) {
      try {
        const payload = Buffer.from(msg.message, 'base64').toString('utf8');
        let json = JSON.parse(payload);
        
        // Decompress if compressed
        if (json?.e && !json?.eventType) {
          const { hashLookup } = require('../services/store');
          json = decompressPayload(json, hashLookup);
        }
        
        if ((json?.type === 'issued' || json?.eventType === 'issued') && (json?.prescriptionId === prescriptionId || json?.topicID === topicId)) return true;
      } catch (_) {}
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Returns latest eventType for a specific QR topicID (embedded in payload) by scanning the audit topic
async function getLastEventType(auditTopicId, targetTopicID) {
  if (!auditTopicId || !targetTopicID) return null;
  const url = `${MIRROR}/topics/${auditTopicId}/messages?limit=100&order=desc`;
  try {
    const { data } = await axios.get(url);
    const messages = data?.messages || [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      try {
        const payload = Buffer.from(msg.message, 'base64').toString('utf8');
        let json = JSON.parse(payload);
        
        // Decompress if compressed (check for 'e' field - compressed eventType indicator)
        if (json?.e && !json?.eventType) {
          const { hashLookup } = require('../services/store');
          json = decompressPayload(json, hashLookup);
        }
        
        // After decompression, use full field names
        if (json?.topicID === targetTopicID) {
          const t = json?.eventType || json?.type;
          if (t) return t; // newest-first
        }
      } catch (_) {}
    }
    return null;
  } catch (e) {
    return null;
  }
}

// BULLETPROOF: Direct status check from Hedera - always returns the real status
async function getTopicStatusFromHedera(targetTopicID) {
  if (!targetTopicID) return 'unknown';
  
  try {
    // FIRST: Check in-memory store (this is where payment/dispense updates are stored)
    try {
      const { getTopicStatus, lastEventTypePerTopic } = require('../services/store');
      const memoryStatus = getTopicStatus(targetTopicID);
      if (memoryStatus && memoryStatus !== 'issued') {
        console.log(`[HEDERA] Topic ${targetTopicID} status from memory: ${memoryStatus}`);
        return memoryStatus;
      }
      // Fallback: Check lastEventTypePerTopic map
      const eventTypeStatus = lastEventTypePerTopic.get(targetTopicID);
      if (eventTypeStatus && eventTypeStatus !== 'issued') {
        console.log(`[HEDERA] Topic ${targetTopicID} status from eventType: ${eventTypeStatus}`);
        return eventTypeStatus;
      }
    } catch (_) {}
    
    // SECOND: Try the audit topic approach
    const auditTopicId = process.env.HEDERA_HCS_TOPIC_ID;
    if (auditTopicId) {
      const auditStatus = await getLastEventType(auditTopicId, targetTopicID);
      if (auditStatus) {
        console.log(`[HEDERA] Topic ${targetTopicID} status from audit: ${auditStatus}`);
        return auditStatus;
      }
    }
    
    // THIRD: Check if topic exists and has any messages
    const topicUrl = `${MIRROR}/topics/${targetTopicID}/messages?limit=1&order=desc`;
    const { data } = await axios.get(topicUrl);
    
    if (data?.messages && data.messages.length > 0) {
      // Topic exists and has messages - check the latest message
      const latestMsg = data.messages[0];
      try {
        const payload = Buffer.from(latestMsg.message, 'base64').toString('utf8');
        let json = JSON.parse(payload);
        
        // Decompress if compressed
        if (json?.e && !json?.eventType) {
          const { hashLookup } = require('../services/store');
          json = decompressPayload(json, hashLookup);
        }
        
        // After decompression, use full field names only
        const status = json?.eventType || json?.type || 'issued';
        console.log(`[HEDERA] Topic ${targetTopicID} status from direct: ${status}`);
        return status;
      } catch (_) {
        console.log(`[HEDERA] Topic ${targetTopicID} has messages but can't parse - defaulting to issued`);
        return 'issued';
      }
    } else {
      // Topic exists but no messages - must be issued
      console.log(`[HEDERA] Topic ${targetTopicID} exists but no messages - defaulting to issued`);
      return 'issued';
    }
  } catch (e) {
    console.error(`[HEDERA] Error checking topic ${targetTopicID}:`, e.message);
    return 'unknown';
  }
}

async function verifyPrescriptionOnMirror({ tokenId, serial, topicId, prescriptionId, patientHash, contentHash }) {
  try {
    let metaOk = false;
    if (tokenId && serial) {
      const meta = await getNftMetadata(tokenId, serial);
      metaOk = !!meta && meta.prescriptionId === prescriptionId && meta.patientHash === patientHash && (!contentHash || meta.contentHash === contentHash);
    }
    let issuedOk = await hasIssuedEvent(topicId, prescriptionId);
    return { metaOk, issuedOk };
  } catch (e) {
    return { metaOk: false, issuedOk: false };
  }
}

module.exports = { getNftMetadata, hasIssuedEvent, verifyPrescriptionOnMirror, getLastEventType, getTopicStatusFromHedera };
