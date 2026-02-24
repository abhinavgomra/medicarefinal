const { createWorker } = require('tesseract.js');
const env = require('../config/env');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSmsClient, getTwilioConfigStatus } = require('../services/smsService');
const User = require('../models/User');

const smsClient = getSmsClient();

/** Normalize phone to E.164 for Twilio (e.g. 7625959963 or 917625959963 -> +919762595963) */
function normalizePhoneToE164(phone) {
  const s = String(phone || '').replace(/\D/g, '');
  if (!s || s.length < 10) return null;
  if (s.length === 10 && (s.startsWith('6') || s.startsWith('7') || s.startsWith('8') || s.startsWith('9'))) {
    return '+91' + s;
  }
  if (s.length === 12 && s.startsWith('91')) return '+' + s;
  if (s.length === 11 && s.startsWith('0')) return normalizePhoneToE164(s.slice(1));
  if (s.length >= 10) return '+' + s;
  return null;
}

// Google AI Client
let genAI = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

let ocrWorker = null;
let ocrWorkerInitPromise = null;
let ocrQueue = Promise.resolve();

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;
  if (!ocrWorkerInitPromise) {
    ocrWorkerInitPromise = (async () => {
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      ocrWorker = worker;
      return worker;
    })().catch((err) => {
      ocrWorkerInitPromise = null;
      throw err;
    });
  }
  return ocrWorkerInitPromise;
}

function enqueueOcrTask(task) {
  const run = ocrQueue.then(task);
  // Keep queue alive even if one task fails.
  ocrQueue = run.catch(() => { });
  return run;
}

exports.ocrPrescription = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  try {
    const { data } = await enqueueOcrTask(async () => {
      const worker = await getOcrWorker();
      return worker.recognize(req.file.buffer);
    });
    res.json({ text: data?.text || '' });
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: 'ocr_failed', details: err.message });
  }
};

exports.transcribeVoice = async (req, res) => {
  if (!genAI) return res.status(400).json({ error: 'voice_disabled_no_key' });
  if (!req.file) return res.status(400).json({ error: 'file required' });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const mimeType = req.file.mimetype || 'audio/webm';

    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType
      },
    };

    const result = await model.generateContent([
      "Transcribe the following audio exactly as spoken. Return only the text.",
      audioPart
    ]);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text || '' });
  } catch (err) {
    console.error('Voice transcription error:', err);
    res.status(500).json({ error: 'transcription_failed', details: err.message });
  }
};

exports.startVerify = async (req, res) => {
  try {
    const twilioConfig = getTwilioConfigStatus();
    if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(400).json({
        error: 'Phone verification (SMS) is not configured. Set up Twilio Verify in .env',
        details: twilioConfig.issues.join('; ') || 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID'
      });
    }
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const e164 = normalizePhoneToE164(phone) || phone;
    const result = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: e164, channel: 'sms' });
    return res.json({ sid: result.sid, status: result.status });
  } catch (err) {
    console.error("Verify Start Error:", err);
    const msg = err.code === 21211
      ? 'Invalid phone number format. Use e.g. +919876543210 or 9876543210'
      : err.code === 20003
        ? 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN'
        : err.message;
    return res.status(500).json({ error: 'verify_start_failed', details: msg });
  }
};

exports.checkVerify = async (req, res) => {
  try {
    const twilioConfig = getTwilioConfigStatus();
    if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(400).json({
        error: 'Phone verification is not configured',
        details: twilioConfig.issues.join('; ') || 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID'
      });
    }
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
    const e164 = normalizePhoneToE164(phone) || phone;
    const check = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: e164, code: String(code).trim() });
    const valid = check.status === 'approved';
    if (valid && req.user) {
      await User.findOneAndUpdate(
        { email: req.user.email },
        { phoneVerified: true, phone: e164 }
      );
    }
    return res.json({ status: check.status, valid });
  } catch (err) {
    console.error("Verify Check Error:", err);
    const msg = err.code === 20404
      ? 'Invalid or expired code. Request a new one.'
      : err.code === 20003
        ? 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN'
        : err.message;
    return res.status(500).json({ error: 'verify_check_failed', details: msg });
  }
};

exports.healthAssistant = async (req, res) => {
  try {
    const { message, language } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

    if (genAI) {
      try {
        const systemPrompt = `You are a careful, empathetic, health-oriented assistant. Communicate in the user's language (hi for Hindi, en for English).\n` +
          `SAFETY: You are NOT a doctor. Provide general information only and advise seeing a professional for diagnosis or emergencies.\n` +
          `STYLE: Short, clear bullet points when helpful. For urgent red flags, clearly recommend emergency services.`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });

        const userPref = language && String(language).toLowerCase().startsWith('hi') ? 'hi' : 'en';
        const prompt = `Language: ${userPref}. User: ${message}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.json({ reply: text });
      } catch (openaiErr) {
        console.warn('Gemini AI failed, falling back to heuristics:', openaiErr.message);
      }
    }

    // Fallback if AI fails or no key
    const text = String(message).toLowerCase();
    let reply = '';
    const isHindi = /[\u0900-\u097F]/.test(message) || (language && String(language).toLowerCase().startsWith('hi'));
    const redFlags = ['chest pain', 'severe bleeding', 'unconscious', 'stroke', 'heart attack'];
    const redFlagDetected = redFlags.some(k => text.includes(k));

    if (isHindi) {
      if (redFlagDetected) {
        reply = 'यह आपातकाल जैसा लग रहा है। कृपया तुरंत अपने नज़दीकी आपातकालीन सेवा/अस्पताल से संपर्क करें या 112/911 पर कॉल करें।';
      } else {
        reply = 'क्षमा करें, AI सेवा उपलब्ध नहीं है। कृपया डॉक्टर से संपर्क करें।';
      }
    } else {
      if (redFlagDetected) {
        reply = 'This sounds urgent. Please contact emergency services or go to the nearest ER immediately.';
      } else {
        reply = 'I apologize, but the AI service is currently unavailable. Please consult a doctor.';
      }
    }
    return res.json({ reply });
  } catch (err) {
    console.error("Health Assistant Error:", err);
    return res.status(500).json({ error: 'assistant_failed' });
  }
};
