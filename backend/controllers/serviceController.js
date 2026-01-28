const { createWorker } = require('tesseract.js');
const env = require('../config/env');
const twilio = require('twilio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Twilio Client
let smsClient = null;
if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC') && env.TWILIO_AUTH_TOKEN) {
  smsClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

// Google AI Client
let genAI = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

exports.ocrPrescription = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const worker = await createWorker();
  try {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data } = await worker.recognize(req.file.buffer);
    await worker.terminate();
    res.json({ text: data?.text || '' });
  } catch (err) {
    try { await worker.terminate(); } catch (_) { }
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
    if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(400).json({ error: 'verify_not_configured' });
    }
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const result = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    return res.json({ sid: result.sid, status: result.status });
  } catch (err) {
    console.error("Verify Start Error:", err);
    return res.status(500).json({ error: 'verify_start_failed' });
  }
};

exports.checkVerify = async (req, res) => {
  try {
    if (!smsClient || !env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(400).json({ error: 'verify_not_configured' });
    }
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
    const check = await smsClient.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });
    return res.json({ status: check.status, valid: check.status === 'approved' });
  } catch (err) {
    console.error("Verify Check Error:", err);
    return res.status(500).json({ error: 'verify_check_failed' });
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
