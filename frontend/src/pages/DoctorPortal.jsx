import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { getDoctorDashboard, getDoctorPatientRecord, updateDoctorProfile } from '../utils/api';

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

const DoctorPortal = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const appointmentsPage = 1;
  const [txPage, setTxPage] = useState(1);

  const [selectedPatientEmail, setSelectedPatientEmail] = useState('');
  const [patientRecord, setPatientRecord] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    specialty: '',
    fees: '',
    experience: '',
    degree: '',
    qualifications: '',
    hospital: '',
    location: '',
    clinicHours: '',
    languages: '',
    about: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const refreshDashboard = async () => {
    const res = await getDoctorDashboard({ appointmentsPage, appointmentsLimit: 10, txPage, txLimit: 10 });
    setData(res);
    const d = res?.doctor || {};
    setProfileForm({
      name: d.name || '',
      specialty: d.specialty || '',
      fees: String(d.fees || ''),
      experience: String(d.experience || ''),
      degree: d.degree || '',
      qualifications: Array.isArray(d.qualifications) ? d.qualifications.join(', ') : '',
      hospital: d.hospital || '',
      location: d.location || '',
      clinicHours: d.clinicHours || '',
      languages: Array.isArray(d.languages) ? d.languages.join(', ') : '',
      about: d.about || ''
    });
    return res;
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await getDoctorDashboard({ appointmentsPage, appointmentsLimit: 10, txPage, txLimit: 10 });
        if (!mounted) return;
        setData(res);
        const d = res?.doctor || {};
        setProfileForm({
          name: d.name || '',
          specialty: d.specialty || '',
          fees: String(d.fees || ''),
          experience: String(d.experience || ''),
          degree: d.degree || '',
          qualifications: Array.isArray(d.qualifications) ? d.qualifications.join(', ') : '',
          hospital: d.hospital || '',
          location: d.location || '',
          clinicHours: d.clinicHours || '',
          languages: Array.isArray(d.languages) ? d.languages.join(', ') : '',
          about: d.about || ''
        });
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load doctor dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [txPage]);

  const todayAppointments = useMemo(() => (Array.isArray(data?.todayAppointments) ? data.todayAppointments : []), [data]);

  useEffect(() => {
    if (!data) return;
    const preferred =
      todayAppointments[0]?.patientEmail ||
      (Array.isArray(data.patientHistory) && data.patientHistory[0]?.patientEmail) ||
      '';
    setSelectedPatientEmail((prev) => prev || preferred);
  }, [data, todayAppointments]);

  useEffect(() => {
    let mounted = true;
    if (!selectedPatientEmail) {
      setPatientRecord(null);
      return () => { mounted = false; };
    }
    setPatientLoading(true);
    setError('');
    (async () => {
      try {
        const record = await getDoctorPatientRecord(selectedPatientEmail);
        if (mounted) setPatientRecord(record);
      } catch (e) {
        if (mounted) {
          setPatientRecord(null);
          setError(e.message || 'Failed to load patient record');
        }
      } finally {
        if (mounted) setPatientLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedPatientEmail]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      await updateDoctorProfile({
        name: profileForm.name,
        specialty: profileForm.specialty,
        fees: Number(profileForm.fees || 0),
        experience: Number(profileForm.experience || 0),
        degree: profileForm.degree,
        qualifications: profileForm.qualifications,
        hospital: profileForm.hospital,
        location: profileForm.location,
        clinicHours: profileForm.clinicHours,
        languages: profileForm.languages,
        about: profileForm.about
      });
      await refreshDashboard();
      setMessage('Doctor profile updated successfully.');
    } catch (e2) {
      setError(e2.message || 'Failed to update doctor profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <div className="py-10 text-gray-600">Loading doctor dashboard...</div>;
  if (error && !data) return <div className="py-10 text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Doctor Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {data.doctor.name} • {data.doctor.specialty}
          </p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><CardTitle className="text-sm">Today Appointments</CardTitle><div className="text-2xl font-bold mt-2">{data.stats.todayAppointments || 0}</div></CardContent></Card>
          <Card><CardContent className="p-4"><CardTitle className="text-sm">Total Appointments</CardTitle><div className="text-2xl font-bold mt-2">{data.stats.totalAppointments}</div></CardContent></Card>
          <Card><CardContent className="p-4"><CardTitle className="text-sm">Total Patients</CardTitle><div className="text-2xl font-bold mt-2">{data.stats.totalPatients}</div></CardContent></Card>
          <Card><CardContent className="p-4"><CardTitle className="text-sm">Your Earnings</CardTitle><div className="text-2xl font-bold mt-2">{formatMoney(data.stats.totalEarnings)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><CardTitle className="text-sm">Platform Commission</CardTitle><div className="text-2xl font-bold mt-2">{formatMoney(data.stats.totalCommission)}</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardContent className="p-5">
              <CardTitle className="mb-4">Today Appointments</CardTitle>
              <div className="space-y-3">
                {todayAppointments.map((a) => (
                  <button
                    key={a.id}
                    className={`w-full text-left border rounded-lg p-3 transition-colors ${selectedPatientEmail === a.patientEmail ? 'border-primary-300 bg-primary-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedPatientEmail(a.patientEmail)}
                  >
                    <div className="font-medium">{a.patientEmail}</div>
                    <div className="text-sm text-gray-600">Time: {a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : a.date}</div>
                    <div className="text-sm text-gray-600">Reason: {a.reason || 'N/A'}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">Status: {a.status}</div>
                  </button>
                ))}
                {todayAppointments.length === 0 && <div className="text-sm text-gray-500">No appointments scheduled for today.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <CardTitle className="mb-4">Patient Record</CardTitle>
              {!selectedPatientEmail && <div className="text-sm text-gray-500">Select a patient to view full history.</div>}
              {patientLoading && <div className="text-sm text-gray-500">Loading patient record...</div>}
              {!patientLoading && patientRecord && (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="font-medium">{patientRecord.patient.fullName || patientRecord.patient.email}</div>
                    <div className="text-sm text-gray-600">Email: {patientRecord.patient.email}</div>
                    <div className="text-sm text-gray-600">Phone: {patientRecord.patient.phone || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Age/Gender: {patientRecord.patient.age || 'N/A'} / {patientRecord.patient.gender || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Blood Group: {patientRecord.patient.bloodGroup || 'N/A'}</div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-semibold mb-1">Medical History Notes</div>
                    <div className="text-sm text-gray-700">{patientRecord.patient.medicalHistory || 'No medical history note provided.'}</div>
                    <div className="text-sm text-gray-700 mt-2">Allergies: {patientRecord.patient.allergies || 'None noted'}</div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="text-sm font-semibold mb-2">Old Problems / Visits</div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {patientRecord.visits.map((v) => (
                        <div key={v.id} className="text-sm border rounded p-2 bg-gray-50">
                          <div className="font-medium">{v.date}</div>
                          <div className="text-gray-600">Reason: {v.reason || 'N/A'}</div>
                          <div className="text-xs text-gray-500 capitalize">Status: {v.status}</div>
                        </div>
                      ))}
                      {patientRecord.visits.length === 0 && <div className="text-sm text-gray-500">No visits yet.</div>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <CardTitle className="mb-4">Commission & Earnings</CardTitle>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Date</th>
                    <th className="py-2">Patient</th>
                    <th className="py-2">Gross</th>
                    <th className="py-2">Commission</th>
                    <th className="py-2">Your Earning</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="py-2">{t.patientEmail}</td>
                      <td className="py-2">{formatMoney(t.grossAmount)}</td>
                      <td className="py-2">{formatMoney(t.platformCommission)}</td>
                      <td className="py-2 font-semibold">{formatMoney(t.doctorEarning)}</td>
                      <td className="py-2 capitalize">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.transactions.length === 0 && <div className="text-sm text-gray-500 pt-3">No transactions yet.</div>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={!data?.pagination?.transactions?.hasPrev}
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {data?.pagination?.transactions?.page || 1} / {data?.pagination?.transactions?.totalPages || 1}
              </span>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                disabled={!data?.pagination?.transactions?.hasNext}
                onClick={() => setTxPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <CardTitle className="mb-4">My Professional Profile</CardTitle>
            <form onSubmit={onSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Specialty</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.specialty} onChange={(e) => setProfileForm((p) => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Consultation Fee (INR)</label>
                <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={profileForm.fees} onChange={(e) => setProfileForm((p) => ({ ...p, fees: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Experience (years)</label>
                <input type="number" min="0" className="w-full px-3 py-2 border rounded-lg" value={profileForm.experience} onChange={(e) => setProfileForm((p) => ({ ...p, experience: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Degree</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.degree} onChange={(e) => setProfileForm((p) => ({ ...p, degree: e.target.value }))} placeholder="e.g. MBBS, MD" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hospital / Clinic</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.hospital} onChange={(e) => setProfileForm((p) => ({ ...p, hospital: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Location</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.location} onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Clinic Hours</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.clinicHours} onChange={(e) => setProfileForm((p) => ({ ...p, clinicHours: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Languages (comma separated)</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.languages} onChange={(e) => setProfileForm((p) => ({ ...p, languages: e.target.value }))} placeholder="English, Hindi" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Qualifications (comma separated)</label>
                <input className="w-full px-3 py-2 border rounded-lg" value={profileForm.qualifications} onChange={(e) => setProfileForm((p) => ({ ...p, qualifications: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">About</label>
                <textarea className="w-full px-3 py-2 border rounded-lg min-h-[90px]" value={profileForm.about} onChange={(e) => setProfileForm((p) => ({ ...p, about: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={savingProfile}>Save Doctor Profile</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorPortal;
