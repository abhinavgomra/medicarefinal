const nodemailer = require('nodemailer');
const env = require('../config/env');

let mailer = null;

async function initMailer() {
    if (mailer) return mailer;

    // If real SMTP is configured, use it
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_TO) {
        try {
            const transport = nodemailer.createTransport({
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: env.SMTP_PORT === 465,
                auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
            });
            // Verify connection
            await transport.verify();
            console.log('[MAIL] SMTP configured', { host: env.SMTP_HOST, port: env.SMTP_PORT });
            mailer = transport;
            return transport;
        } catch (err) {
            console.warn('[MAIL] SMTP init failed', { host: env.SMTP_HOST, port: env.SMTP_PORT, error: err && err.message });
        }
    }

    // Dev fallback: Ethereal test account
    try {
        const testAccount = await nodemailer.createTestAccount();
        const transport = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
        console.log('[MAIL] Using Ethereal (dev) SMTP. Messages will log preview URLs.');
        mailer = transport;
        return transport;
    } catch (_) {
        return null;
    }
}

// Initialize on load
initMailer();

async function sendAppointmentEmail({ doctorId, date, reason, userEmail }) {
    try {
        const transport = await initMailer();
        if (!transport) return;

        const subject = `New appointment request: Doctor #${doctorId} on ${date}`;
        const text = `A new appointment was booked.\n\nDoctor: #${doctorId}\nDate: ${date}\nReason: ${reason || 'N/A'}\nBooked by: ${userEmail}`;

        const info = await transport.sendMail({
            from: env.SMTP_USER || 'no-reply@medicare.local',
            to: env.EMAIL_TO,
            subject,
            text
        });

        const preview = nodemailer.getTestMessageUrl(info);
        console.log('[MAIL] Sent', { messageId: info && info.messageId, preview });
        return { messageId: info && info.messageId, previewUrl: preview || '' };
    } catch (err) {
        console.error('[MAIL] Send failed', err && err.message);
        throw err;
    }
}

async function sendAmbulanceLocationEmail({ location, userEmail, status = 'requested' }) {
    try {
        const transport = await initMailer();
        if (!transport) return;

        const lat = Number(location && location.lat);
        const lng = Number(location && location.lng);
        const mapsUrl = Number.isFinite(lat) && Number.isFinite(lng)
            ? `https://maps.google.com/?q=${lat},${lng}`
            : 'N/A';

        const subject = `Ambulance alert location (${status})`;
        const text = [
            'Ambulance request location received.',
            '',
            `Status: ${status}`,
            `Latitude: ${Number.isFinite(lat) ? lat : 'N/A'}`,
            `Longitude: ${Number.isFinite(lng) ? lng : 'N/A'}`,
            `Maps link: ${mapsUrl}`,
            `Requested by: ${userEmail || 'unknown'}`
        ].join('\n');

        const info = await transport.sendMail({
            from: env.SMTP_USER || 'no-reply@medicare.local',
            to: env.EMAIL_TO,
            subject,
            text
        });

        const preview = nodemailer.getTestMessageUrl(info);
        console.log('[MAIL] Ambulance location sent', { messageId: info && info.messageId, preview });
        return { messageId: info && info.messageId, previewUrl: preview || '' };
    } catch (err) {
        console.error('[MAIL] Ambulance location send failed', err && err.message);
        throw err;
    }
}

module.exports = { sendAppointmentEmail, sendAmbulanceLocationEmail };
