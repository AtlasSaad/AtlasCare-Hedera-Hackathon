/**
 * Environment Variable Validator
 * 
 * Validates that all required environment variables are set
 * and provides clear error messages if any are missing.
 * 
 * Run on server startup to fail fast with helpful feedback.
 */

const Joi = require('joi');

// Define required and optional environment variables
const envSchema = Joi.object({
  // Server Configuration
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  
  // Hedera Configuration (REQUIRED for production)
  HEDERA_ACCOUNT_ID: Joi.string().pattern(/^0\.0\.\d+$/).required()
    .messages({
      'string.pattern.base': 'HEDERA_ACCOUNT_ID must be in format 0.0.xxxxx',
      'any.required': 'HEDERA_ACCOUNT_ID is required (e.g., 0.0.6807699)'
    }),
  HEDERA_PRIVATE_KEY: Joi.string().required()
    .messages({
      'any.required': 'HEDERA_PRIVATE_KEY is required (DER-encoded private key)'
    }),
  HEDERA_NETWORK: Joi.string().valid('mainnet', 'testnet', 'previewnet').default('testnet'),
  HEDERA_MIRROR_NODE_URL: Joi.string().uri().optional(),
  
  // Email Configuration
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().email().optional(),
  MAIL_SECURE: Joi.boolean().optional(),
  
  // SMS/WhatsApp Configuration (Infobip)
  INFOBIP_API_KEY: Joi.string().optional(),
  INFOBIP_BASE_URL: Joi.string().uri().optional(),
  INFOBIP_SENDER: Joi.string().optional(),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters',
      'any.required': 'JWT_SECRET is required for authentication'
    }),
  SIGNATURE_SALT: Joi.string().min(16).optional(),
  CNDP_SALT: Joi.string().min(16).optional(),
  
  // OTP Configuration
  OTP_TTL_SECONDS: Joi.number().min(60).max(3600).default(300),
  
  // Redis Configuration (optional)
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().optional(),
  
  // Feature Flags
  ENABLE_OFFLINE_QUEUE: Joi.boolean().default(true),
  ENABLE_FRAUD_DETECTION: Joi.boolean().default(true),
  
  // Other
  ALLOWED_ORIGINS: Joi.string().optional()
}).unknown(true); // Allow other env vars

/**
 * Validate environment variables
 * @returns {Object} - Validated environment variables
 * @throws {Error} - If validation fails
 */
function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false, // Show all errors, not just first one
    stripUnknown: false
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      key: detail.path.join('.'),
      message: detail.message
    }));
    
    console.error('\n❌ ===== ENVIRONMENT VALIDATION FAILED =====\n');
    console.error('The following environment variables are missing or invalid:\n');
    
    errors.forEach(err => {
      console.error(`  • ${err.key}: ${err.message}`);
    });
    
    console.error('\n💡 TIP: Create a .env file in the backend directory with:');
    console.error('  HEDERA_ACCOUNT_ID=0.0.xxxxx');
    console.error('  HEDERA_PRIVATE_KEY=your-private-key');
    console.error('  JWT_SECRET=your-secret-key-min-32-chars\n');
    console.error('='.repeat(45) + '\n');
    
    throw new Error('Environment validation failed');
  }
  
  return value;
}

/**
 * Get missing optional variables (for warnings)
 * @returns {Array} - List of missing optional variables
 */
function getMissingOptionalVars() {
  const optionalVars = [
    { key: 'MAIL_HOST', description: 'Email server host', impact: 'Email notifications disabled' },
    { key: 'MAIL_USER', description: 'Email username', impact: 'Email notifications disabled' },
    { key: 'MAIL_PASS', description: 'Email password', impact: 'Email notifications disabled' },
    { key: 'INFOBIP_API_KEY', description: 'SMS/WhatsApp API key', impact: 'SMS/WhatsApp disabled' },
    { key: 'SIGNATURE_SALT', description: 'Signature salt', impact: 'Using default salt (less secure)' },
    { key: 'CNDP_SALT', description: 'CNDP salt', impact: 'Using default salt (less secure)' },
    { key: 'REDIS_HOST', description: 'Redis host', impact: 'No Redis caching/queueing' },
    { key: 'HEDERA_MIRROR_NODE_URL', description: 'Hedera Mirror Node URL', impact: 'Using default mirror node' }
  ];
  
  return optionalVars.filter(v => !process.env[v.key]);
}

/**
 * Print environment status
 */
function printEnvStatus() {
  console.log('\n✅ ===== ENVIRONMENT VALIDATION PASSED =====\n');
  
  // Required variables
  console.log('Required Variables:');
  console.log(`  ✓ HEDERA_ACCOUNT_ID: ${process.env.HEDERA_ACCOUNT_ID}`);
  console.log(`  ✓ HEDERA_PRIVATE_KEY: ${'*'.repeat(20)} (${process.env.HEDERA_PRIVATE_KEY.length} chars)`);
  console.log(`  ✓ HEDERA_NETWORK: ${process.env.HEDERA_NETWORK || 'testnet'}`);
  console.log(`  ✓ JWT_SECRET: ${'*'.repeat(20)} (${process.env.JWT_SECRET.length} chars)`);
  
  // Optional variables
  const missing = getMissingOptionalVars();
  if (missing.length > 0) {
    console.log('\n⚠️  Missing Optional Variables:');
    missing.forEach(v => {
      console.log(`  • ${v.key}: ${v.impact}`);
    });
  }
  
  console.log('\n' + '='.repeat(45) + '\n');
}

/**
 * Check if production-ready
 * @returns {boolean}
 */
function isProductionReady() {
  const checks = {
    nodeEnv: process.env.NODE_ENV === 'production',
    hedera: !!process.env.HEDERA_ACCOUNT_ID && !!process.env.HEDERA_PRIVATE_KEY,
    email: !!process.env.MAIL_HOST && !!process.env.MAIL_USER && !!process.env.MAIL_PASS,
    sms: !!process.env.INFOBIP_API_KEY,
    security: process.env.JWT_SECRET?.length >= 32 && !!process.env.SIGNATURE_SALT && !!process.env.CNDP_SALT,
    redis: !!process.env.REDIS_HOST
  };
  
  return Object.values(checks).every(v => v);
}

/**
 * Get production readiness report
 * @returns {Object}
 */
function getProductionReadinessReport() {
  return {
    ready: isProductionReady(),
    checks: {
      'Node Environment': process.env.NODE_ENV === 'production' ? '✅' : '⚠️  (development mode)',
      'Hedera Configuration': (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) ? '✅' : '❌',
      'Email Configuration': (process.env.MAIL_HOST && process.env.MAIL_USER) ? '✅' : '⚠️  (disabled)',
      'SMS Configuration': process.env.INFOBIP_API_KEY ? '✅' : '⚠️  (disabled)',
      'Security Salts': (process.env.SIGNATURE_SALT && process.env.CNDP_SALT) ? '✅' : '⚠️  (using defaults)',
      'Redis Caching': process.env.REDIS_HOST ? '✅' : '⚠️  (disabled)',
      'JWT Secret': process.env.JWT_SECRET?.length >= 32 ? '✅' : '❌'
    }
  };
}

module.exports = {
  validateEnv,
  printEnvStatus,
  isProductionReady,
  getProductionReadinessReport,
  getMissingOptionalVars
};

