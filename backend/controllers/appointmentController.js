const Appointment = require('../models/Appointment');
const User = require('../models/User');
const emailService = require('../services/emailService');
const twilio = require('twilio');
const env = require('../config/env');

// Helper to send SMS (duplicated, should be in a service)
async function sendSms(to, body) {
  try {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      await client.messages.create({ from: env.TWILIO_FROM_NUMBER, to, body });
    }
  } catch (err) {
    console.error('SMS failed', err.message);
  }
}

exports.getAppointments = async (req, res) => {
  try {
    const list = await Appointment.find({}).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch appointments' });
  }
};

exports.createAppointment = async (req, res) => {
  const { doctorId, date, reason } = req.body || {};
  if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date required' });
  try {
    const appt = await Appointment.create({
      doctorId: Number(doctorId),
      date,
      reason: reason || '',
      createdBy: req.user.email
    });
    res.status(201).json(appt);

    // Notifications
    const fresh = await User.findOne({ email: req.user.email });
    if (fresh && fresh.phone) {
      await sendSms(fresh.phone, `Appointment booked by ${req.user.email} for doctor ${doctorId} on ${date}${reason ? ` (${reason})` : ''}.`);
    }
    try {
      await emailService.sendAppointmentEmail({ doctorId, date, reason, userEmail: req.user.email });
    } catch (_) { }
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment payload' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment id/payload' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'not found' });
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: 'invalid appointment id' });
  }
};
