function normalizeToken(rawToken) {
  let token = String(rawToken || '').trim();
  if (!token) return '';

  const hasWrappingQuotes =
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"));
  if (hasWrappingQuotes) {
    token = token.slice(1, -1).trim();
  }

  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim();
  }

  return token;
}

function parsePayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (_) {
    return null;
  }
}

export const getToken = () => {
  const token = normalizeToken(localStorage.getItem('token'));
  if (!token) return '';
  if (token !== localStorage.getItem('token')) {
    localStorage.setItem('token', token);
  }
  return token;
};

export const getTokenPayload = () => {
  const token = getToken();
  if (!token) return null;
  return parsePayload(token);
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  const payload = parsePayload(token);
  if (!payload) return false;
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    localStorage.removeItem('token');
    return false;
  }
  return true;
};

export const isDoctor = () => {
  const payload = getTokenPayload();
  return !!payload && payload.role === 'doctor';
};

export const isAdmin = () => {
  const payload = getTokenPayload();
  return !!payload && payload.role === 'admin';
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};
