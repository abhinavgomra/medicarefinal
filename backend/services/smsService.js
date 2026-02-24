const twilio = require('twilio');
const env = require('../config/env');

let smsClient = null;
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    smsClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

function getTwilioConfigStatus() {
    const issues = [];
    const sid = String(env.TWILIO_ACCOUNT_SID || '').trim();
    const authToken = String(env.TWILIO_AUTH_TOKEN || '').trim();
    const verifyServiceSid = String(env.TWILIO_VERIFY_SERVICE_SID || '').trim();

    if (!sid) {
        issues.push('TWILIO_ACCOUNT_SID is missing');
    } else if (!sid.startsWith('AC')) {
        issues.push('TWILIO_ACCOUNT_SID should start with AC');
    }

    if (!authToken) {
        issues.push('TWILIO_AUTH_TOKEN is missing');
    } else if (authToken.startsWith('VA')) {
        issues.push('TWILIO_AUTH_TOKEN looks incorrect (it should not start with VA)');
    }

    if (verifyServiceSid && !verifyServiceSid.startsWith('VA')) {
        issues.push('TWILIO_VERIFY_SERVICE_SID should start with VA');
    }

    return {
        smsClientReady: Boolean(smsClient),
        verifyReady: Boolean(smsClient && verifyServiceSid),
        messagingReady: Boolean(smsClient && env.TWILIO_FROM_NUMBER),
        issues
    };
}

async function sendSms(to, body) {
    if (!smsClient || !to || !body) return { sent: false };
    if (!env.TWILIO_FROM_NUMBER) {
        return { sent: false, error: 'TWILIO_FROM_NUMBER is missing' };
    }
    try {
        await smsClient.messages.create({
            from: env.TWILIO_FROM_NUMBER,
            to,
            body
        });
        return { sent: true };
    } catch (err) {
        console.error('SMS failed:', err.message);
        return { sent: false, error: err.message };
    }
}

function getSmsClient() {
    return smsClient;
}

module.exports = { sendSms, getSmsClient, getTwilioConfigStatus };
