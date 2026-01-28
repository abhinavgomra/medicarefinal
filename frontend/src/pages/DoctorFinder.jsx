import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { MagnifyingGlassIcon, MapPinIcon, StarIcon } from '@heroicons/react/24/outline';
import { getDoctors, bookAppointment } from '../utils/api';
import { useToast } from '../components/Toast';
import { isAuthenticated } from '../utils/auth';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

const DoctorFinder = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const { addToast } = useToast();
  const [booking, setBooking] = useState({ open: false, doctor: null, date: '', reason: '', saving: false });

  // Load doctors on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getDoctors();
        if (mounted) setDoctors(list || []);
      } catch (e) {
        addToast({ title: 'Failed to load doctors', description: e.message, variant: 'error' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [addToast]);

  // Filter doctors (Live Search)
  const filteredDoctors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const spec = specialty.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchesTerm = !term || d.name.toLowerCase().includes(term);
      const matchesSpec = !spec || d.specialty.toLowerCase().includes(spec);
      return matchesTerm && matchesSpec;
    });
  }, [doctors, searchTerm, specialty]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Find a Doctor</h1>
        <p className="text-slate-600">Search top specialists near you.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 bg-white p-6 rounded-2xl shadow-soft border border-slate-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search by name</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                placeholder="e.g. Sarah"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              placeholder="e.g. Cardiology"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200"
        >
          <MagnifyingGlassIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No doctors found matching your criteria.</p>
          <button
            onClick={() => { setSearchTerm(''); setSpecialty(''); }}
            className="mt-4 text-primary-600 font-medium hover:underline"
          >
            Clear filters
          </button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredDoctors.map((doc) => (
              <motion.div
                layout
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-card hover:-translate-y-1 transition-all duration-300 border-slate-100">
                  <CardContent className="h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={doc.images && doc.images[0] ? doc.images[0] : 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop'}
                        alt={doc.name}
                        className="h-20 w-20 rounded-2xl object-cover shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg text-slate-900">{doc.name}</CardTitle>
                        <div className="text-sm font-medium text-primary-600 mb-1">{doc.specialty}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          <span className="truncate">{doc.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl mb-6">
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold">{Number(doc.rating || 0).toFixed(1)}</span>
                      </div>
                      <div className="w-px h-3 bg-slate-300"></div>
                      <span>{doc.experience} yrs exp</span>
                    </div>

                    <div className="mt-auto">
                      <Button
                        className="w-full justify-center shadow-md shadow-primary-500/20"
                        onClick={() => {
                          if (!isAuthenticated()) {
                            addToast({ title: 'Login required', description: 'Please log in to book an appointment', variant: 'error' });
                            return;
                          }
                          setBooking({ open: true, doctor: doc, date: '', reason: '', saving: false });
                        }}
                      >Book Appointment</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {booking.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setBooking({ open: false, doctor: null, date: '', reason: '', saving: false })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Book with {booking.doctor?.name}</h3>
                <div className="text-sm text-slate-500">{booking.doctor?.specialty}</div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" value={booking.date} onChange={(e) => setBooking(b => ({ ...b, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Visit</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none" placeholder="e.g. Annual checkup" value={booking.reason} onChange={(e) => setBooking(b => ({ ...b, reason: e.target.value }))} />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setBooking({ open: false, doctor: null, date: '', reason: '', saving: false })}>Cancel</Button>
                <Button
                  loading={booking.saving}
                  onClick={async () => {
                    if (!booking.date) {
                      addToast({ title: 'Date required', variant: 'error' });
                      return;
                    }
                    try {
                      setBooking(b => ({ ...b, saving: true }));
                      await bookAppointment({ doctorId: booking.doctor.id, date: booking.date, reason: booking.reason });
                      addToast({ title: 'Appointment booked', variant: 'success' });
                      setBooking({ open: false, doctor: null, date: '', reason: '', saving: false });
                    } catch (e) {
                      addToast({ title: 'Booking failed', description: e.message, variant: 'error' });
                      setBooking(b => ({ ...b, saving: false }));
                    }
                  }}
                >Confirm Booking</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DoctorFinder;
