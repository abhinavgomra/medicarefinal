import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { UserIcon } from '@heroicons/react/24/outline';
import { getDoctors, getAppointments, bookAppointment } from '../utils/api';
import { Button } from '../components/Button';
const AppointmentBooking = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const docs = await getDoctors();
        setDoctors(docs);
        try {
          const appts = await getAppointments();
          setAppointments(appts);
        } catch (_) {
          // unauthenticated will fail; ignore until user logs in
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally { setLoading(false); }
    })();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await bookAppointment({ doctorId: Number(selectedDoctor), date, reason });
      setMessage(`Appointment #${created.id || ''} booked`);
      const appts = await getAppointments();
      setAppointments(appts);
      setSelectedDoctor('');
      setDate('');
      setReason('');
    } catch (err) {
      const msg = err.message || 'Failed to book';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-3">Appointment Booking</h1>
          <p className="text-lg text-gray-600">Choose a doctor and schedule your visit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="glass" className="mb-6">
              <CardContent className="p-6">
                <CardTitle className="mb-4">Book an appointment</CardTitle>
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleBook}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select a doctor</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={date} onChange={(e)=>setDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input type="text" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="md:col-span-3">
                    {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
                    {message && <div className="text-green-600 text-sm mb-2">{message}</div>}
                    <Button type="submit" size="md">Book</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="p-6">
                <CardTitle className="mb-4">Your appointments</CardTitle>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : (
                <div className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">Doctor #{a.doctorId}</div>
                          <div className="text-sm text-gray-600">{a.date} {a.reason ? `• ${a.reason}` : ''}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">ID: {a.id}</div>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <div className="text-gray-500 text-sm">Login to view your appointments.</div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <CardTitle className="mb-4">Tips</CardTitle>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Select the right specialty for your condition</li>
                  <li>Pick a date you can commit to</li>
                  <li>Describe your reason briefly</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;


