import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '../components/Card';
import { login, loginWithGoogle, registerWithType, sendSignupCode } from '../utils/api';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSymbolIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { getTokenPayload } from '../utils/auth';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-identity', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('pass');
  const [mode, setMode] = useState('login');
  const [accountType, setAccountType] = useState('user');
  const [doctorId, setDoctorId] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);

  const navigateAfterLogin = useCallback((loginRes) => {
    const tokenPayload = getTokenPayload();
    const role = (loginRes && loginRes.role) || (tokenPayload && tokenPayload.role);
    if (role === 'doctor') {
      navigate('/doctor-portal', { replace: true });
      return;
    }
    if (role === 'admin') {
      navigate('/admin/pharmacy', { replace: true });
      return;
    }
    const to = (location.state && location.state.from && location.state.from.pathname) || '/';
    navigate(to, { replace: true });
  }, [location.state, navigate]);

  useEffect(() => {
    let cancelled = false;

    if (mode !== 'login') {
      if (googleButtonRef.current) googleButtonRef.current.innerHTML = '';
      return () => { };
    }

    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return () => { };
    }

    const initGoogleLogin = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            const credential = response && response.credential;
            if (!credential) return;

            setError('');
            setGoogleLoading(true);
            try {
              const loginRes = await loginWithGoogle(credential);
              addToast({ title: 'Welcome back', description: 'Google login successful', variant: 'success' });
              navigateAfterLogin(loginRes);
            } catch (err) {
              const message = err.message || 'Google login failed';
              setError(message);
              addToast({ title: 'Login failed', description: message, variant: 'error' });
            } finally {
              setGoogleLoading(false);
            }
          }
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320
        });
      } catch (_) {
        if (!cancelled) setError((prev) => prev || 'Google login is unavailable right now.');
      }
    };

    initGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [addToast, mode, navigateAfterLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailOk = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
    if (!emailOk) {
      setError('Please enter a valid email address');
      return;
    }
    if (String(password).length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (mode === 'register') {
      if (!phone || phone.trim().length < 10) {
        setError('Phone number is required (min 10 digits)');
        return;
      }
      if (!codeSent || !code || code.trim().length < 4) {
        setError('Send verification code first, then enter the code from SMS');
        return;
      }
      if (accountType === 'doctor' && !doctorId) {
        setError('Doctor ID is required for doctor registration');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithType({
          email,
          password,
          phone: phone.trim(),
          code: code.trim(),
          accountType,
          doctorId: accountType === 'doctor' ? Number(doctorId) : null
        });
        addToast({ title: 'Account created', description: 'You can now log in', variant: 'success' });
      }
      const loginRes = await login({ email, password });
      addToast({ title: 'Welcome back', description: 'Login successful', variant: 'success' });
      navigateAfterLogin(loginRes);
    } catch (err) {
      const message = err.message || 'Something went wrong';
      setError(message);
      addToast({ title: 'Login failed', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border border-slate-100 shadow-card">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <CardTitle className="text-2xl font-bold text-slate-800 mb-2">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <p className="text-slate-500">
                  {mode === 'login'
                    ? 'Enter your credentials to access your account'
                    : 'Sign up to get started with Medicare'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <AtSymbolIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <LockClosedIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                        placeholder="e.g. 9876543210 or +919876543210"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setCodeSent(false); }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email) || !phone || phone.trim().length < 10 || sendingCode}
                        loading={sendingCode}
                        onClick={async () => {
                          setError('');
                          setSendingCode(true);
                          try {
                            await sendSignupCode({ email, phone: phone.trim() });
                            setCodeSent(true);
                            addToast({ title: 'Code sent', description: 'Check your SMS', variant: 'success' });
                          } catch (e) {
                            setError(e.message || 'Failed to send code');
                          } finally {
                            setSendingCode(false);
                          }
                        }}
                      >
                        {codeSent ? 'Code sent' : 'Send verification code'}
                      </Button>
                    </div>
                    {codeSent && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Verification code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                          placeholder="Enter 6-digit code from SMS"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                      >
                        <option value="user">Patient</option>
                        <option value="doctor">Doctor</option>
                      </select>
                    </div>
                    {accountType === 'doctor' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Doctor ID</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                          placeholder="Enter doctor ID from doctor list"
                          value={doctorId}
                          onChange={(e) => setDoctorId(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" loading={loading} className="w-full py-3 text-base shadow-lg shadow-primary-500/20">
                  {mode === 'login' ? 'Sign In' : 'Sign Up'}
                </Button>

                {mode === 'login' && (
                  <>
                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-xs uppercase tracking-wide text-slate-400">or</span>
                      </div>
                    </div>
                    {GOOGLE_CLIENT_ID ? (
                      <div className="flex justify-center">
                        <div ref={googleButtonRef} />
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-500">Google login is not configured.</p>
                    )}
                    {googleLoading && (
                      <p className="text-xs text-center text-slate-500">Signing in with Google...</p>
                    )}
                  </>
                )}
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    className="text-primary-600 font-semibold hover:text-primary-700 hover:underline transition-all"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError('');
                      setCodeSent(false);
                      setCode('');
                      setPhone('');
                    }}
                  >
                    {mode === 'login' ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
