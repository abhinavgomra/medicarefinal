const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const Doctor = require('../models/Doctor');
const { authMiddleware } = require('../middleware/authMiddleware');

// Debug: test email endpoint (auth required)
router.post('/debug/email', authMiddleware, async (req, res) => {
    try {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const result = await emailService.sendAppointmentEmail({ doctorId: 1, date: now, reason: 'debug email', userEmail: req.user.email });
        return res.json({ ok: true, ...result });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err && err.message });
    }
});

// Simple no-auth dev check so you can click a URL to test email
router.get('/debug/email-test', async (req, res) => {
    try {
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const result = await emailService.sendAppointmentEmail({ doctorId: 99, date: now, reason: 'email-test (GET)', userEmail: 'dev@local' });
        return res.json({ ok: true, ...result });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err && err.message });
    }
});

// Dev helper: import extra doctors from file (no auth for local dev)
async function importDoctorsExtraHandler(req, res) {
    try {
        const data = require('../data/doctors_extra.json');
        let count = 0;
        for (const d of data) {
            await Doctor.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
            count += 1;
        }
        return res.json({ ok: true, imported: count });
    } catch (err) {
        console.error('Import doctors extra failed:', err.message);
        return res.status(500).json({ ok: false, error: 'import_failed' });
    }
}

router.post('/dev/import-doctors-extra', importDoctorsExtraHandler);
router.get('/dev/import-doctors-extra', importDoctorsExtraHandler);

module.exports = router;
