import { getToken } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return '';
  return token.replace(/^bearer\s+/i, '').replace(/^['"]|['"]$/g, '').trim();
}

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = { message: text };
    }
  }
  if (!res.ok) {
    if (res.status === 401) {
      const errorText = String((data && (data.error || data.message)) || '').toLowerCase();
      if (errorText.includes('token') || errorText.includes('unauthorized')) {
        localStorage.removeItem('token');
      }
    }
    const message = (data && (data.details || data.error || data.message)) || `Request failed (${res.status})`;
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
  if (data?.token) {
    const token = normalizeToken(data.token);
    if (token) localStorage.setItem('token', token);
  }
  return data;
};

export const loginWithGoogle = async (credential) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  });
  const data = await handleResponse(res);
  if (data?.token) {
    const token = normalizeToken(data.token);
    if (token) localStorage.setItem('token', token);
  }
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

export const sendSignupCode = async ({ email, phone }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/send-signup-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone })
  });
  return handleResponse(res);
};

export const registerWithType = async ({ email, password, phone, code, accountType, doctorId }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, phone, code, accountType, doctorId })
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

export const getAppointmentsPage = async ({ page = 1, limit = 20, status, doctorId } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    meta: 'true'
  });
  if (status) params.set('status', status);
  if (doctorId) params.set('doctorId', String(doctorId));

  const res = await fetch(`${API_BASE_URL}/api/appointments?${params.toString()}`, {
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

export const updateAppointment = async (appointmentId, payload = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
};

// Profile
export const getMe = async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { ...getAuthHeaders() } });
  return handleResponse(res);
};

export const updateProfile = async (payload = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
};

export const updatePhone = async (phone) => {
  return updateProfile({ phone });
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

export const getTelemedicineIceServers = async () => {
  const res = await fetch(`${API_BASE_URL}/api/telemedicine/ice-servers`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const getTelemedicineAppointments = async ({ page = 1, limit = 20, status = 'booked' } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (status) params.set('status', status);

  const res = await fetch(`${API_BASE_URL}/api/telemedicine/appointments?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const getTelemedicineMessages = async (appointmentId, { limit = 100 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE_URL}/api/telemedicine/appointments/${appointmentId}/messages?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const createTelemedicineMessage = async (appointmentId, { text, type = 'chat', roomId } = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/telemedicine/appointments/${appointmentId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ text, type, roomId })
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

// Pharmacy
export const getPharmacyProducts = async ({ q, category, inStock, prescription } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (typeof inStock !== 'undefined') params.set('inStock', String(inStock));
  if (typeof prescription !== 'undefined') params.set('prescription', String(prescription));
  const query = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/products${query ? `?${query}` : ''}`);
  return handleResponse(res);
};

export const getAdminPharmacyProducts = async ({
  page = 1,
  limit = 100,
  q,
  category,
  active,
  inStock,
  prescription
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    meta: 'true'
  });
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (typeof active !== 'undefined') params.set('active', String(active));
  if (typeof inStock !== 'undefined') params.set('inStock', String(inStock));
  if (typeof prescription !== 'undefined') params.set('prescription', String(prescription));

  const res = await fetch(`${API_BASE_URL}/api/pharmacy/admin/products?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const createPharmacyProduct = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {})
  });
  return handleResponse(res);
};

export const updatePharmacyProduct = async (id, payload) => {
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload || {})
  });
  return handleResponse(res);
};

export const createPharmacyOrder = async ({ items, notes, deliveryAddress }) => {
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ items, notes, deliveryAddress })
  });
  return handleResponse(res);
};

export const getMyPharmacyOrders = async ({ page = 1, limit = 20, status } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (status) params.set('status', status);

  const res = await fetch(`${API_BASE_URL}/api/pharmacy/orders?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const cancelPharmacyOrder = async (orderId) => {
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const getPharmacyOrdersAdmin = async ({ page = 1, limit = 50, status, userEmail } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (status) params.set('status', status);
  if (userEmail) params.set('userEmail', userEmail);

  const res = await fetch(`${API_BASE_URL}/api/pharmacy/orders?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const updatePharmacyOrderStatus = async (orderId, status) => {
  const res = await fetch(`${API_BASE_URL}/api/pharmacy/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
};

export const getDoctorDashboard = async ({ appointmentsPage = 1, appointmentsLimit = 20, txPage = 1, txLimit = 20 } = {}) => {
  const params = new URLSearchParams({
    appointmentsPage: String(appointmentsPage),
    appointmentsLimit: String(appointmentsLimit),
    txPage: String(txPage),
    txLimit: String(txLimit)
  });

  const res = await fetch(`${API_BASE_URL}/api/doctor/dashboard?${params.toString()}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const getDoctorPatientRecord = async (patientEmail) => {
  const encodedEmail = encodeURIComponent(String(patientEmail || '').trim().toLowerCase());
  const res = await fetch(`${API_BASE_URL}/api/doctor/patients/${encodedEmail}`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse(res);
};

export const updateDoctorProfile = async (payload = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/doctor/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
};
