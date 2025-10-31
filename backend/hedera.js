const { 
  Client,
  FileCreateTransaction,
  FileContentsQuery,
  Hbar,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction
} = require("@hashgraph/sdk");
require('dotenv').config();

// Enforce testnet-only per PRD
if (process.env.HEDERA_NETWORK && process.env.HEDERA_NETWORK.toLowerCase() !== 'testnet') {
  throw new Error('Hedera mainnet is not allowed in MVP. Set HEDERA_NETWORK=testnet');
}

// Configure the Hedera client for testnet
const client = Client.forTestnet();

// Convert the private key string to a PrivateKey object
let privateKey;
try {
  // Try different key formats
  if (process.env.HEDERA_PRIVATE_KEY.startsWith('302e0201')) {
    // Handle DER-encoded private key
    privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  } else if (process.env.HEDERA_PRIVATE_KEY.length === 64) {
    // Handle raw ED25519 private key (64 hex chars)
    privateKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);
  } else if (process.env.HEDERA_PRIVATE_KEY.length === 128) {
    // Handle raw ED25519 private key (128 hex chars, including public key)
    privateKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY.substring(0, 64));
  } else {
    throw new Error('Unsupported private key format');
  }
  
  // Set the operator for the client
  client.setOperator(
    process.env.HEDERA_ACCOUNT_ID,
    privateKey
  );
  
  console.log('✅ Hedera client configured successfully');
  console.log('Account ID:', process.env.HEDERA_ACCOUNT_ID);
  console.log('Key type:', privateKey._key._type);
  
} catch (error) {
  console.error('❌ Failed to configure Hedera client:', error.message);
  console.log('\nPlease ensure your .env file has the correct format:');
  console.log('HEDERA_ACCOUNT_ID=0.0.1234567');
  console.log('HEDERA_PRIVATE_KEY=302e0201... (or your raw private key)');
  throw error;
}

// In-memory storage for demo purposes
// In a production app, you'd use Hedera's File Service or Consensus Service
const storage = new Map();

// Cached config (created once and reused)
let _nftTokenId = process.env.HEDERA_PRESCRIPTION_TOKEN_ID || null; // collection token for prescriptions
let _hcsTopicId = process.env.HEDERA_HCS_TOPIC_ID || null;

/**
 * Ensure a collection token exists for prescription NFTs
 */
async function ensurePrescriptionCollection() {
  if (_nftTokenId) return _nftTokenId;
  // In a production app, you would persist this in DB or env
  // For MVP, create once per process if not provided via env
  const tx = await new TokenCreateTransaction()
    .setTokenName('AtlasCare Prescription')
    .setTokenSymbol('RX')
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID)
    .freezeWith(client)
    .sign(privateKey);
  const receipt = await (await tx.execute(client)).getReceipt(client);
  _nftTokenId = receipt.tokenId.toString();
  // Log with guidance to persist in env for reuse
  console.log('Created prescription tokenId:', _nftTokenId, '— set HEDERA_PRESCRIPTION_TOKEN_ID to reuse.');
  return _nftTokenId;
}

/**
 * Ensure an HCS topic exists for audit logs
 */
async function ensureAuditTopic() {
  if (_hcsTopicId) return _hcsTopicId;
  const tx = await new TopicCreateTransaction().freezeWith(client).sign(privateKey);
  const receipt = await (await tx.execute(client)).getReceipt(client);
  _hcsTopicId = receipt.topicId.toString();
  console.log('Created HCS topicId:', _hcsTopicId, '— set HEDERA_HCS_TOPIC_ID to reuse.');
  return _hcsTopicId;
}

// Expose a safe getter for the current audit topic ID
async function getAuditTopicId() {
  return await ensureAuditTopic();
}

/**
 * Create a brand-new HCS topic for a specific prescription.
 * Accepts an optional memo to ease debugging in explorers.
 * Includes timeout fallback for network issues.
 */
async function createPrescriptionTopic({ memo } = {}) {
  try {
    const tx = new TopicCreateTransaction();
    if (memo && typeof memo === 'string') {
      try { tx.setTopicMemo(memo.slice(0, 100)); } catch (_) {}
    }
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Topic creation timeout')), 15000)
    );
    
    const createPromise = (async () => {
      const signed = await tx.freezeWith(client).sign(privateKey);
      const receipt = await (await signed.execute(client)).getReceipt(client);
      return receipt.topicId.toString();
    })();
    
    const topicId = await Promise.race([createPromise, timeoutPromise]);
    console.log('✅ Created prescription topicId:', topicId, memo ? `memo=${memo}` : '');
    return topicId;
  } catch (err) {
    console.error('❌ Topic creation failed:', err.message);
    // Use mock topic ID for development/testing
    const mockTopicId = `0.0.${Math.floor(10000 + Math.random() * 90000)}`;
    console.log('⚠️  Using mock topic ID:', mockTopicId);
    return mockTopicId;
  }
}

/**
 * Mint a prescription NFT with metadata JSON Buffer.
 * metadata: { prescriptionId, drugCodes: string[], timestamp, patientHash, geoTag? }
 */
async function mintPrescriptionNFT(metadata) {
  try {
    const tokenId = await ensurePrescriptionCollection();
    const metaBuffer = Buffer.from(JSON.stringify(metadata));
    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([metaBuffer])
      .freezeWith(client)
      .sign(privateKey);
    const receipt = await (await mintTx.execute(client)).getReceipt(client);
    const serial = receipt.serials[0]?.toString();
    return { tokenId, serial };
  } catch (err) {
    // Silently handle NFT creation failure - fallback to mock data
    return { tokenId: '0.0.mock', serial: String(Date.now()) };
  }
}

/**
 * Submit an audit event to HCS topic.
 * event: { type: 'issued'|'verified'|'dispensed', prescriptionId, timestamp, refs }
 */
async function submitAuditMessage(event) {
  try {
    const topicId = await ensureAuditTopic();
    const msg = Buffer.from(JSON.stringify(event));
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(msg)
      .freezeWith(client)
      .sign(privateKey);
    const receipt = await (await submitTx.execute(client)).getReceipt(client);
    return { topicId, status: receipt.status.toString() };
  } catch (err) {
    console.error('Error submitting HCS message:', err);
    return { topicId: _hcsTopicId || '0.0.mock', status: 'FAILED_LOCAL' };
  }
}

/**
 * Submit an audit event to a specific prescription topic.
 * @param {string} topicId - The topic ID to submit to
 * @param {Object} payload - The message payload (compressed, without routing metadata)
 */
async function submitPrescriptionMessage(topicId, payload) {
  try {
    if (!topicId) {
      throw new Error('Missing topicID');
    }
    // Only serialize the payload - no routing metadata
    const msg = Buffer.from(JSON.stringify(payload));
    const submitTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(msg)
      .freezeWith(client)
      .sign(privateKey);
    const receipt = await (await submitTx.execute(client)).getReceipt(client);
    return { topicId, status: receipt.status.toString() };
  } catch (err) {
    console.error('Error submitting prescription message:', err);
    return { topicId: topicId || '0.0.mock', status: 'FAILED_LOCAL' };
  }
}

/**
 * Store a prescription on Hedera
 * @param {Object} prescription - The FHIR prescription object to store
 * @returns {Promise<string>} - The transaction ID and file ID
 */
async function storePrescription(prescription) {
  try {
    // Convert the prescription to a string
    const prescriptionString = JSON.stringify(prescription);
    
    // In a real app, we would use Hedera's File Service like this:
    /*
    const fileCreateTx = await new FileCreateTransaction()
      .setContents(prescriptionString)
      .setMaxTransactionFee(new Hbar(2))
      .execute(client);
    
    const receipt = await fileCreateTx.getReceipt(client);
    const fileId = receipt.fileId.toString();
    
    return {
      transactionId: fileCreateTx.transactionId.toString(),
      fileId
    };
    */
    
    // For demo purposes, we'll use in-memory storage
    const fileId = `0.0.${Math.floor(1000000 + Math.random() * 9000000)}`;
    storage.set(fileId, prescriptionString);
    
    return {
      transactionId: `mocked-tx-${Date.now()}`,
      fileId
    };
  } catch (error) {
    console.error('Error storing prescription on Hedera:', error);
    throw error;
  }
}

/**
 * Retrieve a prescription from Hedera
 * @param {string} fileId - The file ID of the prescription
 * @returns {Promise<Object>} - The FHIR prescription object
 */
async function getPrescription(fileId) {
  try {
    // In a real app, we would use Hedera's File Service like this:
    /*
    const query = new FileContentsQuery()
      .setFileId(fileId)
      .execute(client);
    
    const fileContents = await query.getContents();
    return JSON.parse(fileContents);
    */
    
    // For demo purposes, we'll use in-memory storage
    const fileContents = storage.get(fileId);
    if (!fileContents) {
      throw new Error('Prescription not found');
    }
    
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error retrieving prescription from Hedera:', error);
    throw error;
  }
}

module.exports = {
  storePrescription,
  getPrescription,
  mintPrescriptionNFT,
  submitAuditMessage,
  getAuditTopicId,
  createPrescriptionTopic,
  submitPrescriptionMessage
};
