const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const env = require('../config/env');
const { sendSms, getSmsClient, getTwilioConfigStatus } = require('../services/smsService');
const { normalizePhoneToE164 } = require('../utils/phone');

function generateToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' });
}

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function toSafeString(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeOptionalNumber(value, { min = 0, max = 130 } = {}) {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.floor(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function toUserResponse(user) {
  return {
    email: user.email,
    role: user.role,
    doctorId: user.doctorId || null,
    phone: user.phone || '',
    phoneVerified: Boolean(user.phoneVerified),
    fullName: user.fullName || '',
    age: typeof user.age === 'number' ? user.age : null,
    gender: user.gender || '',
    bloodGroup: user.bloodGroup || '',
    allergies: user.allergies || '',
    medicalHistory: user.medicalHistory || ''
  };
}

async function verifyGoogleIdToken(credential) {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google login is not configured');
    err.status = 400;
    throw err;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload() || {};
  const email = String(payload.email || '').trim().toLowerCase();

  if (!email) {
    const err = new Error('Google account email is missing');
    err.status = 401;
    throw err;
  }

  if (!payload.email_verified) {
    const err = new Error('Google account email is not verified');
    err.status = 401;
    throw err;
  }

  return {
    email,
    fullName: String(payload.name || '').trim()
  };
}

/** Send verification code to phone during signup (no auth required) */
exports.sendSignupCode = async (req, res) => {
  const smsClient = getSmsClient();
  const twilioConfig = getTwilioConfigStatus();
  if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
    return res.status(400).json({
      error: 'Phone verification is not configured. Set up Twilio Verify in .env',
      details: twilioConfig.issues.join('; ') || 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID'
    });
  }
  const { email, phone } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !phone) return res.status(400).json({ error: 'email and phone required' });
  if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  try {
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const e164 = normalizePhoneToE164(phone) || phone;
    if (!e164) return res.status(400).json({ error: 'Invalid phone format. Use e.g. 9876543210 or +919876543210' });

    const result = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: e164, channel: 'sms' });
    return res.json({ sid: result.sid, status: result.status });
  } catch (err) {
    console.error('Send signup code error:', err);
    const msg = err.code === 21211
      ? 'Invalid phone number format'
      : err.code === 20003
        ? 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN'
        : err.message;
    return res.status(500).json({ error: 'Failed to send code', details: msg });
  }
};

exports.register = async (req, res) => {
  const { email, password, phone, code, accountType, doctorId } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return res.status(400).json({ error: 'email and password required' });
  if (!phone || !code) return res.status(400).json({ error: 'phone and verification code required' });

  const smsClient = getSmsClient();
  const twilioConfig = getTwilioConfigStatus();
  if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
    return res.status(400).json({
      error: 'Phone verification is not configured',
      details: twilioConfig.issues.join('; ') || 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID'
    });
  }

  try {
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(409).json({ error: 'user exists' });

    const e164 = normalizePhoneToE164(phone) || phone;
    if (!e164) return res.status(400).json({ error: 'Invalid phone format' });

    const check = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: e164, code: String(code).trim() });
    if (check.status !== 'approved') {
      return res.status(400).json({ error: 'Invalid or expired verification code. Request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let role = 'user';
    let finalDoctorId = null;

    if (accountType === 'doctor') {
      const parsedDoctorId = Number(doctorId);
      if (!parsedDoctorId) {
        return res.status(400).json({ error: 'valid doctorId required for doctor registration' });
      }
      const doctor = await Doctor.findOne({ id: parsedDoctorId }).lean();
      if (!doctor) {
        return res.status(404).json({ error: 'doctor profile not found for provided doctorId' });
      }
      role = 'doctor';
      finalDoctorId = parsedDoctorId;
    } else {
      const userCount = await User.countDocuments();
      role = userCount === 0 ? 'admin' : 'user';
    }

    await User.create({
      email: normalizedEmail,
      hashedPassword,
      role,
      doctorId: finalDoctorId,
      phone: e164,
      phoneVerified: true
    });
    res.status(201).json({ message: 'registered', role, doctorId: finalDoctorId });
  } catch (err) {
    console.error('Register error:', err);
    const msg = err.code === 20404
      ? 'Invalid or expired code. Request a new one.'
      : err.code === 20003
        ? 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN'
        : err.message;
    return res.status(500).json({ error: 'failed to register', details: msg });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = generateToken({ email: user.email, role: user.role, doctorId: user.doctorId || null });
    res.json({ token, email: user.email, role: user.role, doctorId: user.doctorId || null });

    // Send SMS notification
    if (user.phone) {
      await sendSms(user.phone, `Login success for ${user.email} at ${new Date().toLocaleString()}`);
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'failed to login', message: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  const credential = String((req.body && req.body.credential) || '').trim();
  if (!credential) return res.status(400).json({ error: 'google credential required' });

  try {
    const googleProfile = await verifyGoogleIdToken(credential);
    let user = await User.findOne({ email: googleProfile.email });

    if (!user) {
      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'admin' : 'user';
      const generatedPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      user = await User.create({
        email: googleProfile.email,
        hashedPassword,
        role,
        fullName: googleProfile.fullName || ''
      });
    } else if (!user.fullName && googleProfile.fullName) {
      user.fullName = googleProfile.fullName;
      await user.save();
    }

    const token = generateToken({
      email: user.email,
      role: user.role,
      doctorId: user.doctorId || null
    });

    return res.json({
      token,
      email: user.email,
      role: user.role,
      doctorId: user.doctorId || null,
      provider: 'google'
    });
  } catch (err) {
    const msg = err && err.message ? err.message : 'failed to login with Google';
    const statusCode = Number(err && err.status) || (msg.toLowerCase().includes('token') ? 401 : 500);
    return res.status(statusCode).json({ error: 'google_login_failed', details: msg });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).lean();
    if (!user) return res.status(404).json({ error: 'not found' });
    return res.json(toUserResponse(user));
  } catch (err) {
    return res.status(500).json({ error: 'failed' });
  }
};

exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body || {};
    const updated = await User.findOneAndUpdate({ email: req.user.email }, { phone: phone || '' }, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.json(toUserResponse(updated));
  } catch (err) {
    return res.status(400).json({ error: 'invalid phone' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const payload = req.body || {};
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
      const newPhone = toSafeString(payload.phone, 30);
      updates.phone = newPhone;
      const current = await User.findOne({ email: req.user.email }).select('phone phoneVerified').lean();
      if (current && String(current.phone || '') !== String(newPhone || '') && current.phoneVerified) {
        updates.phoneVerified = false;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'fullName')) {
      updates.fullName = toSafeString(payload.fullName, 120);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'gender')) {
      updates.gender = toSafeString(payload.gender, 20);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'bloodGroup')) {
      updates.bloodGroup = toSafeString(payload.bloodGroup, 10);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'allergies')) {
      updates.allergies = toSafeString(payload.allergies, 500);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'medicalHistory')) {
      updates.medicalHistory = toSafeString(payload.medicalHistory, 2000);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'age')) {
      updates.age = normalizeOptionalNumber(payload.age, { min: 0, max: 130 });
    }

    const updated = await User.findOneAndUpdate(
      { email: req.user.email },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.json(toUserResponse(updated));
  } catch (err) {
    return res.status(400).json({ error: 'invalid profile payload', message: err.message });
  }
};
