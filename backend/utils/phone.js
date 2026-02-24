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

module.exports = { normalizePhoneToE164 };
