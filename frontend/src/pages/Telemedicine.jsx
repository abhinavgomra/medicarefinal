import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { VideoCameraIcon, ClockIcon, UserIcon, StarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { PageTransition } from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const Telemedicine = () => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const doctors = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      rating: 4.8,
      available: true,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Professional female cardiologist doctor with stethoscope&id=doctor1'
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Pediatrics',
      rating: 4.9,
      available: true,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Friendly male pediatrician doctor smiling&id=doctor2'
    },
    {
      id: 3,
      name: 'Dr. Emily Rodriguez',
      specialty: 'Dermatology',
      rating: 4.7,
      available: false,
      image: 'https://placeholder-image-service.onrender.com/image/200x200?prompt=Professional female dermatologist doctor&id=doctor3'
    }
  ];

  const handleConsult = (doctor) => {
    setSelectedDoctor(doctor);
    setIsConnecting(false);
  };

  const startConsultation = () => {
    setIsConnecting(true);
    // Simulate connection
    setTimeout(() => {
      alert(`Connected with ${selectedDoctor.name}. Video call starting...`);
      setIsConnecting(false);
    }, 2000);
  };

  return (
    <PageTransition>
      <div className="min-h-screen py-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-200/20 rounded-full blur-3xl" />
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-blue-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600 mb-4"
            >
              Telemedicine
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Connect with certified specialists from the comfort of your home.
              Secure, private, and instant video consultations.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Available Doctors List */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Available Specialists</h2>
                <div className="text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full border border-gray-100">
                  {doctors.filter(d => d.available).length} Online Now
                </div>
              </div>

              <div className="space-y-4">
                {doctors.map((doctor, index) => (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card
                      variant="glass"
                      className={`cursor-pointer transition-all duration-300 ${selectedDoctor?.id === doctor.id ? 'ring-2 ring-primary-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'}`}
                      onClick={() => handleConsult(doctor)}
                    >
                      <CardContent className="p-4 sm:p-6 flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={doctor.image}
                            alt={doctor.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${doctor.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{doctor.name}</h3>
                              <p className="text-primary-600 font-medium">{doctor.specialty}</p>
                            </div>
                            <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                              <StarIcon className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                              <span className="font-bold text-yellow-700 text-sm">{doctor.rating}</span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500 gap-2">
                              <span className="flex items-center"><CheckBadgeIcon className="h-3 w-3 mr-1" /> Verified</span>
                              <span>• 10+ Years Exp.</span>
                            </div>
                            <button
                              disabled={!doctor.available}
                              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${doctor.available
                                  ? 'bg-primary-100 text-primary-700 group-hover:bg-primary-500 group-hover:text-white'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                              {doctor.available ? 'Connect' : 'Busy'}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Consultation Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card variant="glass" className="lg:sticky lg:top-24 h-auto min-h-[400px]">
                <CardContent className="p-6 h-full flex flex-col">
                  {!selectedDoctor ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6 opacity-60">
                      <div className="w-24 h-24 bg-gradient-to-tr from-primary-100 to-blue-100 rounded-full flex items-center justify-center animate-pulse-slow">
                        <VideoCameraIcon className="h-12 w-12 text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">Ready to Consult?</h3>
                        <p className="text-gray-500 mt-2">Select an available specialist to start your secure video session.</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      key={selectedDoctor.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="text-center mb-8">
                        <div className="relative inline-block">
                          <img
                            src={selectedDoctor.image}
                            alt={selectedDoctor.name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                          />
                          <div className="absolute bottom-2 right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mt-4">{selectedDoctor.name}</h2>
                        <p className="text-lg text-primary-600 font-medium">{selectedDoctor.specialty}</p>
                      </div>

                      <div className="bg-white/50 rounded-xl p-4 space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Wait Time</span>
                          <span className="font-semibold text-green-600">~ 2 mins</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Consultation Fee</span>
                          <span className="font-bold text-gray-800">$45.00</span>
                        </div>
                      </div>

                      <button
                        onClick={startConsultation}
                        disabled={isConnecting}
                        className="w-full bg-gradient-to-r from-primary-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-wait"
                      >
                        {isConnecting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Establishing Secure Line...
                          </span>
                        ) : 'Start Video Call Now'}
                      </button>
                      <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        End-to-End Encrypted Session
                      </p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Telemedicine;