const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const login = async ({ email, password }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await handleResponse(res);
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
};

export const register = async ({ email, password }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
};

export const getDoctors = async () => {
  const res = await fetch(`${API_BASE_URL}/api/doctors`);
  return handleResponse(res);
};

export const getAppointments = async () => {
  const res = await fetch(`${API_BASE_URL}/api/appointments`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const bookAppointment = async ({ doctorId, date, reason }) => {
  const res = await fetch(`${API_BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ doctorId, date, reason })
  });
  return handleResponse(res);
};

// Profile
export const getMe = async () => {
  const res = await fetch(`${API_BASE_URL}/api/me`, { headers: { ...getAuthHeaders() } });
  return handleResponse(res);
};

export const updatePhone = async (phone) => {
  const res = await fetch(`${API_BASE_URL}/api/me/phone`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ phone })
  });
  return handleResponse(res);
};

// OCR
export const ocrPrescription = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/prescriptions/ocr`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form
  });
  return handleResponse(res);
};

// Voice transcription
export const transcribeVoice = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: form
  });
  return handleResponse(res);
};

// Twilio Verify helpers
export const startPhoneVerification = async (phone) => {
  const res = await fetch(`${API_BASE_URL}/api/verify/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ phone })
  });
  return handleResponse(res);
};

export const checkPhoneVerification = async ({ phone, code }) => {
  const res = await fetch(`${API_BASE_URL}/api/verify/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ phone, code })
  });
  return handleResponse(res);
};

// Health AI assistant
export const healthAssistant = async ({ message, language }) => {
  const res = await fetch(`${API_BASE_URL}/api/ai/health-assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ message, language })
  });
  return handleResponse(res);
};

// Ambulance
export const requestAmbulance = async (location) => {
  const res = await fetch(`${API_BASE_URL}/api/ambulance/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ location })
  });
  return handleResponse(res);
};