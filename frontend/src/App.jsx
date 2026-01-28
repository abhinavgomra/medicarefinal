import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import Telemedicine from './pages/Telemedicine';
import EmergencyCare from './pages/EmergencyCare';
import Pharmacy from './pages/Pharmacy';
import SymptomChecker from './pages/SymptomChecker';
import HealthRecords from './pages/HealthRecords';
import DoctorFinder from './pages/DoctorFinder';
import AppointmentBooking from './pages/AppointmentBooking';
import InsuranceSupport from './pages/InsuranceSupport';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PrescriptionOCR from './pages/PrescriptionOCR';
import VoiceControl from './pages/VoiceControl';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/telemedicine" element={<ProtectedRoute><PageTransition><Telemedicine /></PageTransition></ProtectedRoute>} />
        <Route path="/emergency-care" element={<ProtectedRoute><PageTransition><EmergencyCare /></PageTransition></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute><PageTransition><Pharmacy /></PageTransition></ProtectedRoute>} />
        <Route path="/symptom-checker" element={<ProtectedRoute><PageTransition><SymptomChecker /></PageTransition></ProtectedRoute>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route
          path="/health-records"
          element={
            <ProtectedRoute>
              <PageTransition><HealthRecords /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/doctor-finder" element={<ProtectedRoute><PageTransition><DoctorFinder /></PageTransition></ProtectedRoute>} />
        <Route path="/appointment-booking" element={<ProtectedRoute><PageTransition><AppointmentBooking /></PageTransition></ProtectedRoute>} />
        <Route path="/insurance-support" element={<ProtectedRoute><PageTransition><InsuranceSupport /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/prescription-ocr" element={<ProtectedRoute><PageTransition><PrescriptionOCR /></PageTransition></ProtectedRoute>} />
        <Route path="/voice-control" element={<ProtectedRoute><PageTransition><VoiceControl /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-grow pt-2 md:pt-3 px-3 md:px-5 lg:px-6">
            <div className="w-full max-w-6xl xl:max-w-7xl mx-auto">
              <AnimatedRoutes />
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;