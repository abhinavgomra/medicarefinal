import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';
import {
  VideoCameraIcon,
  BoltIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Home = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
              Healthcare <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">Reimagined</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Experience the future of medical care with our AI-powered platform.
              Book appointments, consult specialists instantly, and manage your health records—all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40">
                  Get Started
                </Button>
              </Link>
              <Link to="/doctor-finder">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Find a Doctor
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Decorative blob */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-secondary-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Placeholder Illustration - Replace with an actual refined image later if needed */}
            <div className="relative bg-white/40 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="h-2 w-12 bg-primary-100 rounded mb-2"></div>
                  <div className="h-8 w-8 bg-primary-100 rounded-full mb-2"></div>
                  <div className="h-2 w-24 bg-slate-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm mt-8">
                  <div className="h-2 w-12 bg-secondary-100 rounded mb-2"></div>
                  <div className="h-8 w-8 bg-secondary-100 rounded-full mb-2"></div>
                  <div className="h-2 w-24 bg-slate-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <div className="h-2 w-12 bg-accent-100 rounded mb-2"></div>
                  <div className="h-8 w-8 bg-accent-100 rounded-full mb-2"></div>
                  <div className="h-2 w-24 bg-slate-100 rounded"></div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm mt-8">
                  <div className="h-2 w-12 bg-orange-100 rounded mb-2"></div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full mb-2"></div>
                  <div className="h-2 w-24 bg-slate-100 rounded"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Explore Services</h2>
            <div className="h-1 flex-1 mx-6 bg-slate-100 rounded-full hidden sm:block"></div>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
          >
            {[
              { title: 'Telemedicine', desc: 'Secure video consultations.', to: '/telemedicine', icon: VideoCameraIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
              { title: 'Emergency Care', desc: 'Urgent medical response.', to: '/emergency-care', icon: BoltIcon, color: 'text-red-500', bg: 'bg-red-50' },
              { title: 'Find a Doctor', desc: 'Top-rated specialists.', to: '/doctor-finder', icon: UserGroupIcon, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { title: 'Appointments', desc: 'Easy scheduling.', to: '/appointment-booking', icon: CalendarDaysIcon, color: 'text-violet-500', bg: 'bg-violet-50' },
              { title: 'Pharmacy', desc: 'Order meds online.', to: '/pharmacy', icon: BeakerIcon, color: 'text-teal-500', bg: 'bg-teal-50' },
              { title: 'Health Records', desc: 'Secure history access.', to: '/health-records', icon: ClipboardDocumentCheckIcon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { title: 'Insurance Support', desc: 'Claims & coverage.', to: '/insurance-support', icon: ShieldCheckIcon, color: 'text-cyan-500', bg: 'bg-cyan-50' },
              { title: 'Prescription OCR', desc: 'Digitize Rxs instantly.', to: '/prescription-ocr', icon: DocumentTextIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
              { title: 'Voice Control', desc: 'Hands-free navigation.', to: '/voice-control', icon: MicrophoneIcon, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
            ].map((f) => (
              <Link key={f.to} to={f.to}>
                <motion.div
                  variants={item}
                  className="group relative h-full bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-card hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{f.desc}</p>

                  <div className="absolute bottom-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    <span className="text-primary-500 text-sm font-medium">Open &rarr;</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
