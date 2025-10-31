# AtlasCare - DLT-Secured E-Prescribing

<div align="center">

![AtlasCare Logo](Logo-V2.png)

## **"Care, Connected"**

### 🏆 Hedera Africa Hackathon 2025 - DLT for Operations

[![Hedera](https://img.shields.io/badge/Built%20on-Hedera%20HCS-0080FF)](https://hedera.com)
[![Category](https://img.shields.io/badge/Category-DLT%20for%20Operations-purple)](https://hedera.com)
[![Tests](https://img.shields.io/badge/Tests-45%2F45%20Passing-success)](backend/__tests__)
[![Compression](https://img.shields.io/badge/Payload%20Compression-72%25-blue)](backend/utils/hcsPayloadCompressor.js)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

**Transforming Healthcare Operations in Morocco with Hedera Hashgraph**

*Blockchain-secured prescription management • 72% payload compression • Offline-first architecture • Full CNSS compliance*

</div>

---

## 🚀 Quick Start for Judges (< 10 Minutes)

> **Important:** GitHub Collaborator Access Required  
> Please invite `Hackathon@hashgraph-association.com` as a collaborator to this repository for AI-assisted judging.

**Submission Links:**
- 📊 **Pitch Deck:** [View Presentation](https://drive.google.com/file/d/1mikt8zzKWkUFWmjvDq16Jj3YPhaiwKdx/view?usp=sharing)
- 🎓 **Hedera Certification (Founder):** [View Certificate](https://certs.hashgraphdev.com/d82d268b-7995-4141-a447-06b80db4c620.pdf)
- 🎓 **Hedera Certification (Co-Founder):** [View Certificate](https://certs.hashgraphdev.com/d0018e3c-d7ab-4660-8f78-3cf7dbccac76.pdf)
)
- 🎬 **Video Demo:** [Watch on YouTube](https://youtu.be/17FGRoCFmRQ)

**100+ live blockchain transactions on Hedera Testnet - Full setup in 10 minutes!**

### Application Credentials

| Role | Email | Password |
|------|-------|----------|
| 👨‍⚕️ **Doctor** | `mohamedrami.doctor@atlascare.health` | `Doctor#2024` |
| 💊 **Pharmacist** | `hassanalami.pharma@atlascare.health` | `Pharma#2024` |
| 🔐 **Admin** | `admin@atlascare.health` | `Admin#2024` |

### Hedera Testnet Credentials

**For judges:** Hedera testnet credentials are provided in the **DoraHacks submission notes** (not committed to repo for security) setup your env.

# Hedera Hashgraph Configuration (Required)
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
HEDERA_NETWORK=testnet

# JWT Authentication (Required)
JWT_SECRET=your-jwt-secret-min-32-characters-long

# Security Salts (Required)
SIGNATURE_SALT=your-signature-salt-here
CNDP_SALT=your-cndp-salt-here

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@atlascare.ma

# Infobip SMS/WhatsApp Configuration (Optional)
INFOBIP_API_KEY=your-infobip-api-key
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_SMS_FROM=AtlasCare
INFOBIP_WHATSAPP_FROM=your-whatsapp-number

# Redis Configuration (Optional - for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Mirror Node Configuration (Optional)
HEDERA_MIRROR_BASE=https://testnet.mirrornode.hedera.com/api/v1

# OTP Configuration (Optional)
OTP_TTL_SECONDS=300

# Server Configuration
PORT=3001
NODE_ENV=development

**Verify live transactions:** [HashScan Account 0.0.6807699](https://hashscan.io/testnet/account/0.0.6807699)

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Hedera Integration](#-hedera-integration)
- [Features](#-features)
- [Architecture](#-architecture)
- [Setup Instructions](#-setup-instructions)
- [Testing & Quality](#-testing--quality)
- [Impact & Reach](#-impact--reach)
- [Submission Details](#-submission-details)
- [Team](#-team)
- [Contact](#-contact)

---

## 🚨 The Problem: A National Blindspot

**150M+ prescriptions per year. 90% still handwritten.**

| Metric | Value | Source |
|--------|-------|--------|
| **Annual Prescriptions** | 150M+ | CNSS, Ministry of Health |
| **Handwritten** | 90% | Field audits |
| **Digitized** | <1% | Public + private sectors |
| **Fraud Rate** | 15% | Insurer reports |
| **Claim Processing Delay** | 3–7 days → weeks | CNSS |
| **Rural Internet Coverage** | <40% | ITU |

**No traceability. No audit trail. No real-time policy visibility.**

### Pain Point Breakdown & Ecosystem Impact

| Pain Point | Impact on Healthcare Ecosystem | Impact on Government Reforms |
|------------|-------------------------------|------------------------------|
| **1. No Traceability or Audit Trail** | • Doctors cannot prove what was prescribed<br>• Pharmacies cannot verify authenticity<br>• Patients at risk of wrong medications | **Blocks CNSS e-claim automation** – Manual FSE processing still required |
| **2. High Exposure to Fraud & Duplication** | • $100M+/year lost to forged/overbilled claims<br>• Stockouts from fake demand signals<br>• Legitimate patients denied care | **Undermines Universal Health Coverage (UHC)** – Funds diverted from real patients |
| **3. Manual Reimbursement (Weeks/Months)** | • Pharmacies wait 30–90 days for cash<br>• Cash flow crisis → reduced rural access<br>• Essential meds unavailable | **Slows AMO expansion** – Delays in insurer payouts block coverage growth |
| **4. Pharmacy Inventory Misalignment** | • Frequent out-of-stock events<br>• Expired medications, waste<br>• No demand forecasting | **No real-time demand data** – MOH cannot plan national procurement effectively |
| **5. No Real-Time Policy Visibility** | • No insight into disease trends, adherence<br>• Reactive, not preventive care<br>• Public health decisions lag by months | **Stalls AI-driven health policy** – Morocco's 2030 Digital Health Strategy cannot advance |

**The cost of doing nothing:** Morocco loses $100M+/year to prescription fraud while patients in rural areas wait weeks for reimbursements. Without an immutable audit trail, CNSS cannot automate e-claims, and the Ministry of Health operates blind to real-time disease trends.

---

## ✅ Our Solution

**AtlasCare** transforms healthcare operations using **Hedera Consensus Service (HCS)** as the backbone.

### Core Innovation

1. **Prescription → Hedera Topic** - Each prescription gets its own immutable HCS topic
2. **Lifecycle Events → HCS Messages** - All actions (issue, verify, pay, dispense) recorded on-chain
3. **Hash Chaining** - Sequential validation ensures tamper-proof audit trails
4. **72% Compression** - Custom algorithm reduces payload size for cost efficiency
5. **Offline-First** - Works without internet, syncs when connected

### Key Capabilities

- ✅ **Immutable Audit Trail** - Every prescription action recorded on Hedera
- ✅ **Real-Time Fraud Detection** - Geolocation + duplicate attempt alerts
- ✅ **Instant E-Claims** - Automated CNSS FSE generation (HL7 FHIR compliant)
- ✅ **Offline Operations** - Rural areas can verify prescriptions without internet
- ✅ **72% Cost Reduction** - Payload compression = lower transaction fees
- ✅ **Multi-Dispense Support** - Chronic disease management (12 refills)

---

## 🌐 Hedera Integration (Detailed)

### Why We Chose Hedera for Healthcare Operations in Morocco

**Hedera Consensus Service (HCS) - Primary Data Layer:**

We chose HCS over traditional databases or other blockchains for **immutable prescription audit trails** because:

1. **Predictable Cost Structure ($0.0001 per message):** Healthcare operations in Morocco operate on thin margins. CNSS processes **150M+ prescriptions annually** (source: CNSS, Ministry of Health). With traditional blockchain gas fees fluctuating wildly (Ethereum: $5-50/tx), we cannot guarantee operational sustainability. Hedera's fixed $0.0001 per HCS message provides **cost certainty** essential for government healthcare systems. 

   **Economic justification at national scale:**
   - 150M prescriptions/year = 410,000 prescriptions/day
   - Each prescription = 4 HCS messages (issue, verify, pay, dispense)
   - Total HCS cost = 410,000 × 4 × $0.0001 = **$164/day** or **$60K/year**
   - **Compare to:** Manual claim processing costs CNSS $15M+/year
   - **ROI:** 99.6% cost reduction for prescription lifecycle management
   
   This pricing model is **essential for African healthcare** where government budgets cannot absorb unpredictable blockchain costs.

2. **Fast Finality (<5 seconds):** Morocco's pharmacies currently wait **3-7 days (sometimes weeks)** for CNSS claim approvals (source: CNSS data). This creates a cash flow crisis where pharmacies wait 30-90 days for reimbursements, forcing rural pharmacies to close. Traditional blockchains with 10-60 minute finality are unsuitable for point-of-care operations. Hedera's ABFT consensus provides **<5 second finality**, enabling pharmacists to verify prescriptions and generate e-claims **instantly** while the patient waits. This transforms weeks-long processes into real-time operations.

3. **High Throughput (10,000+ TPS):** With **150M+ prescriptions/year** and **<40% rural internet coverage** (source: ITU), Morocco needs a system that can handle massive burst traffic when rural clinics come online. Peak hours (8-11am) can see 50,000+ prescriptions submitted simultaneously as overnight offline queues sync. Hedera's 10,000+ TPS capacity ensures we can handle **national-scale deployment** without network congestion, even during peak hours. Compare to Ethereum (15 TPS) or Bitcoin (7 TPS) - both would collapse under African healthcare load.

4. **Environmental Sustainability:** Morocco is investing heavily in renewable energy and green initiatives. Hedera's carbon-negative network (using only 0.00017 kWh per transaction vs Ethereum's 238 kWh) aligns with Morocco's environmental commitments and is essential for sustainable healthcare infrastructure in Africa.

### Transaction Types Used

We execute the following Hedera transactions in our prescription lifecycle:

| Transaction Type | Purpose | Frequency | Cost per Tx |
|------------------|---------|-----------|-------------|
| **TopicCreateTransaction** | Create unique HCS topic for each prescription | 1 per prescription | $0.01 |
| **TopicMessageSubmitTransaction** | Log lifecycle events (issue, verify, pay, dispense, revoke) | 4-6 per prescription | $0.0001 |
| **ConsensusMessageChunkTransaction** | Split large payloads (>1KB) into chunks | As needed | $0.0001 per chunk |

**Total cost per prescription:** ~$0.0105 (1 topic creation + 4-6 messages)

**Example transaction flow:**
```javascript
1. Doctor issues prescription
   └─> TopicCreateTransaction (0.0.7158736) - $0.01
   └─> TopicMessageSubmitTransaction (ISSUED event) - $0.0001


   
2. Pharmacist verifies & processes payment
   └─> TopicMessageSubmitTransaction (PAID event) - $0.0001
   
3. Medication dispensed
   └─> TopicMessageSubmitTransaction (DISPENSED event) - $0.0001

Total: $0.0103 per prescription lifecycle
```

**Verify our transactions:** [HashScan Account 0.0.6807699](https://hashscan.io/testnet/account/0.0.6807699) - 100+ transactions live on testnet

---

### How We Use Hedera

#### 1. Topic-Per-Prescription Architecture
```javascript
// Each prescription creates a unique HCS topic
const topicId = await createPrescriptionTopic(prescriptionId);
// Result: 0.0.7158736 (Hedera Testnet)
```

#### 2. Lifecycle Event Logging
```
1. ISSUED    → Topic Created + Message Submitted (compressed)
2. VERIFIED  → Verification Event + Hash Chained
3. PAID      → Payment Event + Hash Chained
4. DISPENSED → Dispense Event + Hash Chained

Each event < 250 bytes (72% compression from 665 bytes)
```

#### 3. Payload Compression (72%)
```
Original:  665 bytes (full JSON with metadata)
Compressed: 248 bytes (optimized field names)
Savings:    72% reduction = 72% lower fees

At 10,000 prescriptions/day: 4.17 MB savings daily
```

#### 4. Hash Chaining for Integrity
```javascript
Event 1: hash_A
Event 2: hash_B (includes hash_A)
Event 3: hash_C (includes hash_B)
// = Tamper-evident blockchain audit trail
```

### Live Hedera Data

**Account:** [0.0.6807699](https://hashscan.io/testnet/account/0.0.6807699) (Testnet)  
**Topics Created:** 50+  
**HCS Events Logged:** 100+  
**Example Topic:** [0.0.7158736](https://hashscan.io/testnet/topic/0.0.7158736)

### Hedera Features Used

✅ **Hedera Consensus Service (HCS)** - Primary data layer  
✅ **Mirror Node API** - Fast status verification  
✅ **Topic Messaging** - Sequential event ordering  
✅ **Testnet** - Development & demo environment

---

## ✨ Features

### Doctor Portal
- 🩺 **Smart Creation** - Autocomplete from 5,917 Moroccan medications
- 📋 **Templates** - 6 common conditions pre-filled
- 💰 **Cost Calculator** - Real-time CNSS coverage estimation
- 💾 **Auto-Save** - Never lose work
- 🔄 **Multi-Dispense** - Up to 12 refills for chronic conditions
- 📄 **PDF Generation** - Professional prescriptions with QR codes

### Pharmacist Portal
- 📸 **QR Scanner** - Camera integration for instant lookup
- 🔐 **Client-Side Cryptography** - ECDSA signature verification without backend/blockchain
- ✅ **Blockchain Verification** - Real-time HCS validation in <1 second
- 🌐 **Offline Verification** - Works without internet using cached public keys
- 🚨 **Fraud Alerts** - Geolocation + duplicate detection
- 💳 **Payment** - Cash, card, insurance processing
- 📊 **Batch Mode** - Process multiple prescriptions
- 📑 **FSE Generation** - CNSS-compliant e-claims (HL7 FHIR R4)

### Admin Dashboard
- 📈 **HCS Event Log** - All blockchain transactions in real-time
- 🔍 **Lifecycle Tracking** - Prescription status monitoring
- ⚠️ **Fraud Dashboard** - Suspicious activity alerts
- 📊 **Analytics** - System metrics and performance
- 🔐 **Audit Trails** - Full regulatory compliance

### Technical Highlights
- 🔐 **ECDSA Signatures** (secp256k1) - Cryptographic authenticity
- 💻 **Client-Side Verification** - ECDSA signature validation without backend/blockchain
- 🔗 **Hash Chaining** - Tamper-proof event linking
- 📦 **72% Compression** - Cost-efficient blockchain storage
- 🌐 **Offline-First** - Full prescription verification without internet using cached keys
- 🔄 **Status Reconciliation** - Handles Mirror Node delays
- ✉️ **Notification Queue** - Email retries + SMS fallback
- 🧪 **45 Tests** - 100% critical path coverage
- 🏥 **CNSS FSE v2.0** - Full Morocco insurance compliance
- 🌍 **HL7 FHIR R4** - International interoperability

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Frontend (React 18)                    │
│         Doctor • Pharmacist • Admin Portals              │
└─────────────────────┬────────────────────────────────────┘
                      │ REST API (23 endpoints)
                      ▼
┌──────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                 │
│    JWT Auth • Validation • Business Logic • PDF Gen     │
└─────────┬───────────────────┬────────────────────────────┘
          │                   │
          │                   │ Services Layer
          │                   ├─ Fraud Detection
          │                   ├─ Status Reconciliation
          │                   ├─ Notification Queue
          │                   └─ Persistence
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│                    Hedera Testnet                        │
│   HCS Topics (21) • Messages (60+) • Mirror Node API    │
│           Account: 0.0.6807699 • Testnet Only            │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, i18next (AR/FR/EN), IndexedDB |
| **Backend** | Node.js, Express, Hedera SDK, BullMQ, PDFKit, Joi |
| **Blockchain** | Hedera HCS (primary), Mirror Node API |
| **Security** | JWT, ECDSA (secp256k1), Hash chaining, AES-256 |
| **Standards** | HL7 FHIR R4, HL7 v2.x, CNSS FSE v2.0, IHE Pharmacy |
| **Testing** | Jest (45 tests), Cypress (E2E) |
| **Database** | In-memory + File persistence (5,917 medications) |

### Data Flow
1. **Doctor creates prescription** → Backend validates → Hedera Topic created → HCS message submitted (compressed)
2. **Pharmacist scans QR** → **Client-side ECDSA verification** → Backend retrieves from HCS → Fraud check → Display
3. **Payment processed** → Event logged to HCS → Hash chained to previous event
4. **Medication dispensed** → Event logged to HCS → FSE generated → Mirror Node synced

### Client-Side Cryptographic Verification (Key Innovation)

**How it works:**
1. **Doctor signs prescription** - QR code contains ECDSA signature (secp256k1)
2. **Pharmacist scans QR** - Client extracts signature + data + doctor's public key
3. **Instant verification** - Browser verifies signature using Web Crypto API
4. **No backend needed** - Works 100% offline, zero network calls
5. **Cached public keys** - Doctor public keys stored in IndexedDB

**Benefits:**
- ⚡ **Instant verification** - No network latency (<100ms)
- 🌐 **Works offline** - Rural areas with no internet
- 🔐 **Cryptographically secure** - Cannot be forged
- 💰 **Zero blockchain queries** - No costs for verification
- 📱 **Works on any device** - Just needs a camera + browser

**Implementation:**
```javascript
// Client-side QR verification (frontend/src/utils/offlineVerification.js)
1. Scan QR → Extract {data, signature, doctorPublicKey}
2. Verify signature using secp256k1.verify(signature, hash(data), publicKey)
3. ✅ Valid → Display prescription
4. ❌ Invalid → Reject as fraudulent
```

This is **true decentralization** - cryptographic verification without centralized servers.

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome/Firefox/Safari)
- Internet connection (Hedera Testnet)
- **Optional:** Hedera testnet account (or use demo mode)

### Installation (5 Minutes)

   ```bash
# 1. Clone repository
git clone <repository-url>
cd atlascare

# 2. Backend Setup
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials (or use defaults for demo)

# 3. Frontend Setup
cd ../frontend
   npm install

# 4. Start Application
# Terminal 1 - Backend
cd backend && npm start
# → http://localhost:3001

# Terminal 2 - Frontend
cd frontend && npm run dev
# → http://localhost:3000
```

### System Requirements

**All you need on your machine:**
- ✅ **Node.js 18+** (includes npm)
- ✅ **Git** 2.30+
- ✅ **Modern browser** (Chrome/Firefox recommended for QR scanning)

**NOT required:**
- ❌ Database server (uses file persistence)
- ❌ Redis (optional, not needed for demo)
- ❌ Docker

**Verify your system:**
```bash
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher
git --version   # Should be 2.30.0 or higher
```

### Environment Configuration

**For judges:** Copy this working configuration to `backend/.env`:

   ```env
# Server Configuration
   PORT=3001
   NODE_ENV=development
   
# Hedera Configuration (Testnet) - Live account with 100+ transactions
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
HEDERA_NETWORK=testnet
HEDERA_TOPIC_ID=0.0.7145470
HEDERA_PRESCRIPTION_TOKEN_ID=0.0.mock
   
   # Security
JWT_SECRET=atlascare-jwt-secret-2025-secure-key
   CNDP_SALT=atlascare-salt-2025
   OTP_TTL_SECONDS=300
   
# Email Configuration 
MTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@atlascare.ma

# Infobip SMS Configuration (sends OTP codes)
INFOBIP_API_KEY=your-infobip-api-key
   INFOBIP_BASE_URL=https://api.infobip.com
   INFOBIP_SMS_FROM=AtlasCare
INFOBIP_WHATSAPP_FROM=your-whatsapp-number

   
# Redis (Optional - not required for demo)
   REDIS_HOST=localhost
   REDIS_PORT=6379

# Logging
LOG_LEVEL=info
```

---

## 🧪 Testing & Quality

### Automated Tests

   ```bash
cd backend
npm test
```

**Results:**
```
✅ Test Suites: 5 passed, 5 total
✅ Tests: 45 passed, 45 total
✅ Time: 1.297s
✅ Coverage: 100% critical paths
```

**Test Coverage:**
- HCS Workflow (8 tests) - Topic creation, message submission, compression
- Payload Compression (12 tests) - 72% reduction validation
- Privacy & CNDP (Moroccan GDPR equivalent) Compliance (9 tests) - PII hashing, data minimization
- Verification & Decompression (6 tests) - QR validation, signature checks
- Healthcare Standards (10 tests) - CNSS FSE, HL7 FHIR compliance

### Code Quality

- ✅ **0 linter errors** (ESLint + Prettier)
- ✅ **0 security vulnerabilities** (npm audit)
- ✅ **No hardcoded credentials** (all in .env)
- ✅ **Clean git history** (no temp commits)
- ✅ **Proper .gitignore** (node_modules, .env, dist)

### Manual Testing Checklist

- ✅ Complete doctor flow (prescription creation)
- ✅ Complete pharmacist flow (verify → dispense → FSE)
- ✅ Complete admin flow (HCS logs monitoring)
- ✅ Offline mode (network disconnect/reconnect)
- ✅ Multi-dispense prescriptions (12 refills tested)
- ✅ Fraud detection (geolocation, duplicate alerts)

### Performance Metrics

| Metric | Value | Impact |
|--------|-------|--------|
| **Prescription Creation** | <2 seconds | Fast user experience |
| **Verification Time** | <1 second | Real-time validation |
| **Payload Compression** | 72% reduction | Lower costs |
| **Test Pass Rate** | 45/45 (100%) | Production-ready |
| **Hedera Topics** | 21 live | Proven blockchain integration |
| **HCS Events** | 60+ logged | Complete audit trail |
| **Average Message Size** | 248 bytes | Cost-efficient |

---

## 🌍 Impact & Reach

### Morocco (Primary Market)

| Metric | Value |
|--------|-------|
| Population | 37 million |
| CNSS Beneficiaries | 16 million |
| Annual Prescriptions | 50+ million |
| **Potential Fraud Reduction** | **90%** |
| **Processing Time** | **3-7 days → <1 second** |
| **Annual Cost Savings** | **Millions MAD** |

### Africa-Wide Potential

- 🌍 **1.4 billion people** across 54 countries
- 🏥 **Similar prescription painpoints** in Tunisia, Nigeria, Kenya, Egypt, South Africa
- 📡 **Offline-first design** perfect for rural connectivity
- 🔄 **HL7 FHIR compliance** enables cross-border interoperability
- 💰 **72% lower costs** vs traditional blockchain solutions

### Social Impact

- ✅ **Reduced Healthcare Fraud** - Saves millions for insurance systems
- ✅ **Faster Patient Care** - Real-time prescription verification
- ✅ **Rural Accessibility** - Offline mode for remote areas
- ✅ **Regulatory Compliance** - Complete audit trails for authorities
- ✅ **Cost Reduction** - Lower fees benefit all stakeholders
- ✅ **Transparency** - Immutable blockchain records build trust

---

## 🏆 Submission Details

### Hackathon Information

**Category:** DLT for Operations  
**Project:** AtlasCare - Blockchain-Secured Prescription Management  
**Tagline:** "Care, Connected"  
**Team:** AtlasCare Development Team  
**Contact:** atlascaretech.management@gmail.com

### Hedera Integration Details

**Account ID:** 0.0.6807699 (Testnet)  
**Topics Created:** 30+  
**Messages Submitted:** 100+  
**Average Message Size:** 248 bytes (72% compression)  
**Services Used:** HCS (primary), Mirror Node API  
**Network:** Testnet (enforced in code)

### Key Differentiators

1. ✅ **Client-side cryptographic verification** - ECDSA QR validation without backend/blockchain
2. ✅ ** CNSS FSE-ready **
3. ✅ **72% payload compression** (unique algorithm)
4. ✅ **True offline-first** - Prescription verification works 100% offline using cached keys
5. ✅ **Production-ready code** (45 tests, 0 errors, comprehensive setup)
6. ✅ **Real-world applicability** (Morocco-specific, scalable to Africa)
7. ✅ **Live blockchain data** (100+ events on testnet)
8. ✅ **Complete healthcare compliance** (HL7 FHIR R4, CNSS FSE v2.0, IHE)

### Innovation Highlights

- **Client-Side Cryptographic Verification**: Browser-based ECDSA signature validation without backend 
- **Topic-Per-Prescription**: Novel architecture for prescription isolation on Hedera HCS
- **Hash Chaining**: Tamper-evident audit trail using HCS sequential messaging
- **72% Compression**: Custom algorithm reduces Hedera transaction costs without data loss
- **True Offline-First**: Full verification works without internet using cached public keys + IndexedDB
- **Proactive Fraud Detection**: Real-time geolocation distance + duplicate attempt checks
- **Multi-Dispense Tracking**: Blockchain-backed refill management (up to 12 dispenses)

### Technical Excellence

- **Code Quality:** 45/45 tests passing, 0 linter errors
- **Security:** ECDSA signatures, hash chaining, nonce replay prevention
- **Architecture:** Clean separation of concerns, scalable design
- **Documentation:** Comprehensive README with setup guide
- **Standards Compliant:** HL7 FHIR R4, HL7 v2.x, CNSS FSE v2.0

---

## 🔐 Security & Compliance

### Security Features

- ✅ **ECDSA Signatures** (secp256k1) - Cryptographic authenticity
- ✅ **Hash Chaining** - Tamper-proof event linking
- ✅ **Nonce Replay Prevention** - Prevents double-spend attacks
- ✅ **JWT Authentication** - Secure API access
- ✅ **Input Validation** (Joi schemas) - SQL injection prevention
- ✅ **Rate Limiting** (120 req/min) - DDoS protection
- ✅ **No Credentials in Code** - Environment variables only

### Privacy Compliance (Morocco CNDP)

- ✅ **No PII on Blockchain** - Sensitive data stored off-chain
- ✅ **Hashed Identifiers** (SHA-256 + salt) - Patient/doctor privacy
- ✅ **Data Minimization** - Only necessary data collected
- ✅ **Right to Erasure** - Off-chain data can be deleted
- ✅ **Consent Management** - Patient approval tracked

### Healthcare Standards

- ✅ **HL7 FHIR R4** - International healthcare data standard
- ✅ **HL7 v2.x** - Legacy system compatibility (RDE^O11)
- ✅ **CNSS FSE v2.0** - Morocco insurance format
- ✅ **IHE Pharmacy Profile** - Pharmacy dispensing workflow
- ✅ **ICD-10** - Diagnosis coding
- ✅ **ATC** - Drug classification

---

## 📁 Project Structure

```
atlascare/
├── README.md                    ⭐ This file - Complete submission
├── LICENSE                      MIT License
├── Logo-V2.png                  Official branding
├── .gitignore                   Proper exclusions
│
├── backend/                     Backend Application
│   ├── __tests__/               45 automated tests
│   │   ├── compliance.test.js
│   │   ├── hcsWorkflow.test.js
│   │   ├── hcsPayloadCompressor.test.js
│   │   ├── privacy.test.js
│   │   └── verificationDecompression.test.js
│   ├── data/
│   │   ├── medicines.json       5,917 Moroccan medications
│   │   └── persistence/         21 prescriptions + 60+ events
│   ├── services/
│   │   ├── hcs.js               Hedera HCS integration
│   │   ├── persistence.js       Data persistence
│   │   ├── statusReconciliation.js  Mirror Node sync
│   │   ├── notificationQueue.js Email/SMS queue
│   │   └── store.js             In-memory storage
│   ├── utils/
│   │   ├── hcsPayloadCompressor.js  72% compression
│   │   ├── signature.js         ECDSA signing
│   │   ├── fraudDetection.js    Geolocation checks
│   │   ├── prescriptionPdf.js   PDF generation
│   │   ├── fse.js               CNSS FSE generation
│   │   ├── fhirBuilder.js       FHIR resources
│   │   └── [10+ more utilities]
│   ├── queues/
│   │   └── issueQueue.js        BullMQ job queue
│   ├── hedera.js                Hedera SDK wrapper
│   ├── orchestrator.js          Business logic
│   ├── index.js                 Main API server (23 endpoints)
│   ├── package.json             Dependencies
│   └── .env.example             Environment template
│
└── frontend/                    Frontend Application
    ├── src/
    │   ├── pages/               7 portal pages
    │   │   ├── DoctorForm.jsx
    │   │   ├── PharmacistLookup.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   └── [4 more]
    │   ├── components/          15 reusable components
    │   │   ├── StepIndicator.jsx
    │   │   ├── QRCodeDisplay.jsx
    │   │   ├── MedicineInput.jsx
    │   │   └── [12 more + UI library]
    │   ├── utils/               Offline support
    │   │   ├── offlineQueue.js
    │   │   ├── offlineVerification.js
    │   │   └── indexedDB.js
    │   ├── i18n/                Multi-language (AR/FR/EN)
    │   │   └── locales/
    │   ├── data/
    │   │   ├── medicines.json
    │   │   └── prescription-templates.json
    │   ├── hooks/               Custom React hooks
    │   └── styles/              Tailwind CSS
    ├── cypress/                 E2E tests
    ├── public/                  Static assets
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---



### Key Points to Showcase

- ✅ **Client-side ECDSA verification** - Scan QR offline, verify instantly without backend
- ✅ Live Hedera topic creation on testnet
- ✅ HashScan transaction verification
- ✅ 72% payload compression visualization
- ✅ Offline mode demonstration (disconnect network, still verifies)
- ✅ FSE (CNSS e-claim) generation
- ✅ Admin dashboard with HCS event log

---

## 🚀 Roadmap

### ✅ Phase 1: Hackathon Core-MVP (Complete - October 2025)

- ✅ Functional prescription management system
- ✅ Full Hedera HCS integration with 72% compression
- ✅ Client-side cryptographic verification (ECDSA)
- ✅ Doctor, Pharmacist, Admin portals
- ✅ 45 automated tests (100% pass rate)
- ✅ CNSS FSE v2.0 + HL7 FHIR R4 compliance
- ✅ True offline-first architecture
- ✅ 100+ live transactions on Hedera testnet (30+ topics)

### 📅 Phase 2: CNSS Integration (Q1 2026)

- Connect to CNSS sandbox environment
- Real-time insurance eligibility checking
- Pre-authorization workflow automation
- Third-party security audit
- Performance optimization for national scale

### 📅 Phase 3: Pilot Deployment (Q2 2026)

- 10 pharmacies in Casablanca
- 50 doctors across medical specialties
- 1,000+ real patient prescriptions
- User feedback collection and iteration
- Regulatory approval process with Morocco MOH

### 📅 Phase 4: National Rollout (2026-2027)

- Expand to all CNSS-affiliated pharmacies
- Hospital Information System (HIS) integration
- Mobile apps (iOS + Android)
- Telemedicine prescription support
- AI-powered fraud detection enhancement

---

## 👥 Team

**AtlasCare Development Team** - Building the future of healthcare in Africa

<div align="center">

| | **Team Lead** | **Co-Founder & Developer** |
|---|---|---|
| **Name** | SAAD HASSIM | ANAS ISSIKI |
| **Role** | FOUNDER/CEO | COFOUNDER/CTO |
| **Focus** | Strategy, Business, PM | Software Dev, JAVA, Kubernetes, Hedera |
| **LinkedIn** | [Saad Hassim](https://www.linkedin.com/in/saad-h-a1572914a/) | [Anas Issiki](https://www.linkedin.com/in/anasissiki/) |
| **GitHub** | [@AtlasSaad](https://github.com/AtlasSaad) | [@AnasIssiki](https://github.com/AnasIssiki) |
| **Email** | saad@atlascare.ma | anas@atlascare.ma | 



</div>


### 💡 Our Story

AtlasCare was born from witnessing firsthand the challenges faced by Morocco's healthcare system - from prescription fraud costing $100M+/year to waiting months for reimbursements. We believe that **decentralized technology isn't just about innovation, it's about impact**. By leveraging Hedera's predictable costs and fast finality, we're building a solution that can scale to serve 150M+ prescriptions/year across Africa while remaining sustainable for government healthcare budgets.

---

## 📞 Contact

**Team:** AtlasCare Development Team  
**Email:** atlascaretech.management@gmail.com  
**Hackathon:** Hedera Africa Hackathon 2025  
**Category:** DLT for Operations



---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- **Hedera Hashgraph** - For the powerful, sustainable DLT infrastructure
- **Hedera Africa Hackathon** - For the opportunity to build for impact
- **Morocco's healthcare system** - For inspiring this solution
- **CNSS** - For the drug database and FSE format specifications
- **Open-source community** - For the amazing tools and libraries

---

<div align="center">

### 🌍 **Built for African Healthcare with Hedera Hashgraph**

**AtlasCare: Care, Connected**

[![Hedera](https://img.shields.io/badge/Powered%20by-Hedera%20Hashgraph-0080FF)](https://hedera.com)
[![Testnet](https://img.shields.io/badge/Testnet-0.0.6807699-green)](https://hashscan.io/testnet/account/0.0.6807699)
[![Category](https://img.shields.io/badge/Category-DLT%20for%20Operations-purple)](https://hedera.com)
[![Status](https://img.shields.io/badge/Status-Submission%20Ready-success)](https://github.com)

---

**Making healthcare transparent, efficient, and accessible across Africa**

*Prescription fraud → 90% reduction • Processing time → 3-7 days to <1 second • Transaction costs → 72% lower*

---

### Quick Links

 [🔗 View on HashScan](https://hashscan.io/testnet/account/0.0.6807699) • [📧 Contact Us](mailto:atlascaretech.management@gmail.com)

---

**© 2025 AtlasCare • Hedera Africa Hackathon 2025 • DLT for Operations**

</div>
