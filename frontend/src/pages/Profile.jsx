import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { getMe, updatePhone, startPhoneVerification, checkPhoneVerification } from '../utils/api';
import { useToast } from '../components/Toast';

const Profile = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setEmail(me.email);
        setRole(me.role);
        setPhone(me.phone || '');
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      }
    })();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const me = await updatePhone(phone);
      setPhone(me.phone || '');
      setMessage('Phone updated successfully');
      addToast({ title: 'Phone updated', variant: 'success' });
    } catch (e) {
      const msg = e.message || 'Failed to update';
      setError(msg);
      addToast({ title: 'Update failed', description: msg, variant: 'error' });
    }
  };

  const onStartVerify = async () => {
    setError(''); setMessage(''); setVerifying(true);
    try {
      await startPhoneVerification(phone);
      addToast({ title: 'Code sent', description: 'Check your SMS messages', variant: 'success' });
    } catch (e) {
      const msg = e.message || 'Failed to send code';
      setError(msg);
      addToast({ title: 'Failed to send code', description: msg, variant: 'error' });
    } finally { setVerifying(false); }
  };

  const onCheckVerify = async () => {
    setError(''); setMessage(''); setVerifying(true);
    try {
      const result = await checkPhoneVerification({ phone, code });
      if (result.valid) {
        setMessage('Phone verified');
        addToast({ title: 'Phone verified', variant: 'success' });
      } else {
        setError('Invalid code');
        addToast({ title: 'Invalid code', variant: 'error' });
      }
    } catch (e) {
      const msg = e.message || 'Verification failed';
      setError(msg);
      addToast({ title: 'Verification failed', description: msg, variant: 'error' });
    } finally { setVerifying(false); }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="glass">
          <CardContent className="p-6">
            <CardTitle className="mb-4">Profile</CardTitle>
            <div className="mb-6 text-sm text-gray-600">Role: <span className="font-medium">{role}</span></div>
            <form className="space-y-4" onSubmit={onSave}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input disabled value={email} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="e.g. +1xxxxxxxxxx" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              {message && <div className="text-sm text-green-600">{message}</div>}
              <div className="flex gap-3">
                <Button type="submit">Save</Button>
                <Button variant="secondary" disabled={!phone} loading={verifying} onClick={onStartVerify}>Send code</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
                  <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="123456" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="md:col-span-2">
                  <Button loading={verifying} onClick={onCheckVerify}>Verify</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;


