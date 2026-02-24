const routes = [
  { path: '/', name: 'Home', component: 'Home', protected: false },
  { path: '/telemedicine', name: 'Telemedicine', component: 'Telemedicine', protected: true },
  { path: '/emergency-care', name: 'Emergency Care', component: 'EmergencyCare', protected: true },
  { path: '/pharmacy', name: 'Pharmacy', component: 'Pharmacy', protected: true },
  { path: '/symptom-checker', name: 'Symptom Checker', component: 'SymptomChecker', protected: true },
  { path: '/health-records', name: 'Health Records', component: 'HealthRecords', protected: true },
  { path: '/doctor-finder', name: 'Doctor Finder', component: 'DoctorFinder', protected: true },
  { path: '/appointment-booking', name: 'Appointment Booking', component: 'AppointmentBooking', protected: true },
  { path: '/insurance-support', name: 'Insurance Support', component: 'InsuranceSupport', protected: true },
  { path: '/profile', name: 'Profile', component: 'Profile', protected: true },
  { path: '/prescription-ocr', name: 'Prescription OCR', component: 'PrescriptionOCR', protected: true },
  { path: '/voice-control', name: 'Voice Control', component: 'VoiceControl', protected: true },
  { path: '/doctor-portal', name: 'Doctor Portal', component: 'DoctorPortal', protected: true, doctorOnly: true },
  { path: '/admin/pharmacy', name: 'Pharmacy Admin', component: 'PharmacyAdmin', protected: true, adminOnly: true },
];

export default routes;
