import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { getMe, updateProfile, startPhoneVerification, checkPhoneVerification } from '../utils/api';
import { useToast } from '../components/Toast';

const Profile = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
    age: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: ''
  });
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setEmail(me.email);
        setRole(me.role);
        setPhoneVerified(Boolean(me.phoneVerified));
        setProfile({
          fullName: me.fullName || '',
          phone: me.phone || '',
          age: typeof me.age === 'number' ? String(me.age) : '',
          gender: me.gender || '',
          bloodGroup: me.bloodGroup || '',
          allergies: me.allergies || '',
          medicalHistory: me.medicalHistory || ''
        });
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      }
    })();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const payload = {
        fullName: profile.fullName,
        phone: profile.phone,
        age: profile.age === '' ? null : Number(profile.age),
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        medicalHistory: profile.medicalHistory
      };
      const me = await updateProfile(payload);
      setProfile({
        fullName: me.fullName || '',
        phone: me.phone || '',
        age: typeof me.age === 'number' ? String(me.age) : '',
        gender: me.gender || '',
        bloodGroup: me.bloodGroup || '',
        allergies: me.allergies || '',
        medicalHistory: me.medicalHistory || ''
      });
      setMessage('Profile updated successfully');
      addToast({ title: 'Profile updated', variant: 'success' });
    } catch (e) {
      const msg = e.message || 'Failed to update';
      setError(msg);
      addToast({ title: 'Update failed', description: msg, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const onStartVerify = async () => {
    setError(''); setMessage(''); setVerifying(true);
    try {
      await startPhoneVerification(profile.phone);
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
      const result = await checkPhoneVerification({ phone: profile.phone, code });
      if (result.valid) {
        setPhoneVerified(true);
        setMessage('Phone verified');
        setCode('');
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  value={profile.fullName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input disabled value={email} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone {phoneVerified && <span className="text-green-600 text-xs font-normal">(Verified ✓)</span>}
                </label>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +919876543210 or 9876543210"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {role === 'user' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input
                        type="number"
                        min="0"
                        max="130"
                        value={profile.age}
                        onChange={(e) => setProfile((prev) => ({ ...prev, age: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        value={profile.gender}
                        onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                      <input
                        value={profile.bloodGroup}
                        onChange={(e) => setProfile((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                        placeholder="e.g. O+"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                    <input
                      value={profile.allergies}
                      onChange={(e) => setProfile((prev) => ({ ...prev, allergies: e.target.value }))}
                      placeholder="Medicine or food allergies"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                    <textarea
                      value={profile.medicalHistory}
                      onChange={(e) => setProfile((prev) => ({ ...prev, medicalHistory: e.target.value }))}
                      placeholder="Past conditions, surgeries, long-term treatments..."
                      className="w-full px-3 py-2 border rounded-lg min-h-[110px] focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </>
              )}
              {error && <div className="text-sm text-red-600">{error}</div>}
              {message && <div className="text-sm text-green-600">{message}</div>}
              <div className="flex gap-3">
                <Button type="submit" loading={saving}>Save</Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!profile.phone || phoneVerified}
                  loading={verifying}
                  onClick={onStartVerify}
                >
                  {phoneVerified ? 'Verified' : 'Send code'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
                  <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="123456" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" loading={verifying} onClick={onCheckVerify}>Verify</Button>
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

