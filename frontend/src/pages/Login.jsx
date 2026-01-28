import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '../components/Card';
import { login, register } from '../utils/api';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSymbolIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('pass');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ email, password });
        addToast({ title: 'Account created', description: 'You can now log in', variant: 'success' });
      }
      await login({ email, password });
      addToast({ title: 'Welcome back', description: 'Login successful', variant: 'success' });
      const to = (location.state && location.state.from && location.state.from.pathname) || '/';
      navigate(to, { replace: true });
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
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    className="text-primary-600 font-semibold hover:text-primary-700 hover:underline transition-all"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError('');
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
