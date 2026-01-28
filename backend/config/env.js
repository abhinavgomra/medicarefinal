require('dotenv').config();

const env = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET,
    MONGODB_URI: process.env.MONGODB_URI,
    USE_IN_MEMORY_DB: String(process.env.USE_IN_MEMORY_DB || 'true').toLowerCase() !== 'false',

    // Twilio
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
    NOTIFY_TO_NUMBER: process.env.NOTIFY_TO_NUMBER,

    // AI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,

    // Email
    EMAIL_TO: process.env.EMAIL_TO,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: Number(process.env.SMTP_PORT || 587),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
};

// Validation for critical secrets
const requiredSecrets = ['JWT_SECRET', 'MONGODB_URI'];
const missingSecrets = requiredSecrets.filter(key => !env[key]);

if (missingSecrets.length > 0) {
    if (env.USE_IN_MEMORY_DB && missingSecrets.includes('MONGODB_URI') && missingSecrets.length === 1) {
        // Allowed if using in-memory DB
    } else {
        console.warn(`[WARNING] Missing critical environment variables: ${missingSecrets.join(', ')}`);
        // In a strict production env, we might want to throw error here
        // throw new Error(\`Missing required environment variables: \${missingSecrets.join(', ')}\`);
    }
}

module.exports = env;
