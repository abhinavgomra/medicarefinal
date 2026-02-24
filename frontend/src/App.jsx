import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DoctorRoute } from './components/DoctorRoute';
import { AdminRoute } from './components/AdminRoute';
import { UserRoute } from './components/UserRoute';
import Home from './pages/Home';
import Telemedicine from './pages/Telemedicine';
import EmergencyCare from './pages/EmergencyCare';
import Pharmacy from './pages/Pharmacy';
import PharmacyAdmin from './pages/PharmacyAdmin';
import SymptomChecker from './pages/SymptomChecker';
import HealthRecords from './pages/HealthRecords';
import DoctorFinder from './pages/DoctorFinder';
import AppointmentBooking from './pages/AppointmentBooking';
import InsuranceSupport from './pages/InsuranceSupport';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PrescriptionOCR from './pages/PrescriptionOCR';
import VoiceControl from './pages/VoiceControl';
import DoctorPortal from './pages/DoctorPortal';
import { getTokenPayload, isAuthenticated } from './utils/auth';

function RoleAwareHome() {
  if (!isAuthenticated()) return <PageTransition><Home /></PageTransition>;
  const payload = getTokenPayload() || {};
  if (payload.role === 'doctor') return <Navigate to="/doctor-portal" replace />;
  if (payload.role === 'admin') return <Navigate to="/admin/pharmacy" replace />;
  return <PageTransition><Home /></PageTransition>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RoleAwareHome />} />
        <Route path="/telemedicine" element={<ProtectedRoute><PageTransition><Telemedicine /></PageTransition></ProtectedRoute>} />
        <Route path="/emergency-care" element={<UserRoute><PageTransition><EmergencyCare /></PageTransition></UserRoute>} />
        <Route path="/pharmacy" element={<UserRoute><PageTransition><Pharmacy /></PageTransition></UserRoute>} />
        <Route path="/symptom-checker" element={<UserRoute><PageTransition><SymptomChecker /></PageTransition></UserRoute>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route
          path="/health-records"
          element={
            <UserRoute>
              <PageTransition><HealthRecords /></PageTransition>
            </UserRoute>
          }
        />
        <Route path="/doctor-finder" element={<UserRoute><PageTransition><DoctorFinder /></PageTransition></UserRoute>} />
        <Route path="/appointment-booking" element={<UserRoute><PageTransition><AppointmentBooking /></PageTransition></UserRoute>} />
        <Route path="/insurance-support" element={<UserRoute><PageTransition><InsuranceSupport /></PageTransition></UserRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/prescription-ocr" element={<UserRoute><PageTransition><PrescriptionOCR /></PageTransition></UserRoute>} />
        <Route path="/voice-control" element={<UserRoute><PageTransition><VoiceControl /></PageTransition></UserRoute>} />
        <Route path="/doctor-portal" element={<DoctorRoute><PageTransition><DoctorPortal /></PageTransition></DoctorRoute>} />
        <Route path="/admin/pharmacy" element={<AdminRoute><PageTransition><PharmacyAdmin /></PageTransition></AdminRoute>} />
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
