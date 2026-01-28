const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const twilio = require('twilio');

// Helper to send SMS (duplicated from original server.js for now, ideally should be a service)
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

function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' });
}

exports.register = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'user exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';

    await User.create({ email, hashedPassword, role });
    res.status(201).json({ message: 'registered' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'failed to register', message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = generateToken({ email, role: user.role });
    res.json({ token, email });

    // Send SMS notification
    if (user.phone) {
      await sendSms(user.phone, `Login success for ${email} at ${new Date().toLocaleString()}`);
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'failed to login', message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).lean();
    if (!user) return res.status(404).json({ error: 'not found' });
    return res.json({ email: user.email, role: user.role, phone: user.phone || '' });
  } catch (err) {
    return res.status(500).json({ error: 'failed' });
  }
};

exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body || {};
    const updated = await User.findOneAndUpdate({ email: req.user.email }, { phone: phone || '' }, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.json({ email: updated.email, role: updated.role, phone: updated.phone || '' });
  } catch (err) {
    return res.status(400).json({ error: 'invalid phone' });
  }
};
