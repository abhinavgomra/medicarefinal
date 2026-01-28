const routes = [
  { path: '/', name: 'Home', component: 'Home', protected: false },
  { path: '/telemedicine', name: 'Telemedicine', component: 'Telemedicine', protected: false },
  { path: '/emergency-care', name: 'Emergency Care', component: 'EmergencyCare', protected: false },
  { path: '/pharmacy', name: 'Pharmacy', component: 'Pharmacy', protected: false },
  { path: '/symptom-checker', name: 'Symptom Checker', component: 'SymptomChecker', protected: false },
  { path: '/health-records', name: 'Health Records', component: 'HealthRecords', protected: true },
  { path: '/doctor-finder', name: 'Doctor Finder', component: 'DoctorFinder', protected: false },
  { path: '/appointment-booking', name: 'Appointment Booking', component: 'AppointmentBooking', protected: false },
  { path: '/insurance-support', name: 'Insurance Support', component: 'InsuranceSupport', protected: false },
  { path: '/profile', name: 'Profile', component: 'Profile', protected: true },
  { path: '/prescription-ocr', name: 'Prescription OCR', component: 'PrescriptionOCR', protected: true },
];

export default routes;
