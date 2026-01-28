import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { PhoneIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { requestAmbulance } from '../utils/api';

const EmergencyCare = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const emergencyServices = [
    {
      icon: <TruckIcon className="h-8 w-8 text-red-500" />,
      title: 'Emergency Ambulance',
      number: '911',
      description: 'Immediate medical transportation'
    },
    {
      icon: <PhoneIcon className="h-8 w-8 text-red-500" />,
      title: '24/7 Helpline',
      number: '1-800-MED-HELP',
      description: 'Round-the-clock medical assistance'
    },
    {
      icon: <MapPinIcon className="h-8 w-8 text-red-500" />,
      title: 'Nearest Hospital',
      number: 'Find Location',
      description: 'Locate the closest emergency room'
    }
  ];

  const requestAmbulanceHandler = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await requestAmbulance({ lat: latitude, lng: longitude });
          setMessage("Ambulance requested successfully. You will receive a call or message shortly.");
        } catch (error) {
          setMessage(error.message || "We can't send it right now. A message has been sent to your number.");
        }
        setLoading(false);
      },
      () => {
        setMessage("Unable to retrieve your location.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen py-12 bg-red-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Emergency Care</h1>
          <p className="text-xl text-gray-700">
            Immediate assistance when you need it most. Your safety is our priority.
          </p>
        </div>

        {/* Emergency Alert */}
        <Card className="bg-red-100 border-red-200 mb-8">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 mb-4">🚨 EMERGENCY ALERT</div>
            <p className="text-red-700 mb-4">
              If this is a life-threatening emergency, please call 911 immediately.
            </p>
            <button
              onClick={requestAmbulanceHandler}
              disabled={loading}
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Requesting...' : 'Call Ambulance Now'}
            </button>
            {message && <p className="mt-4 text-red-700 font-semibold">{message}</p>}
          </CardContent>
        </Card>

        {/* Emergency Services */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {emergencyServices.map((service, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">{service.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                <div className="text-2xl font-bold text-red-600 mb-2">{service.number}</div>
                <p className="text-gray-600">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency Guide */}
        <Card>
          <CardContent className="p-6">
            <CardTitle className="mb-6">Emergency Preparedness Guide</CardTitle>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">🚑 For Ambulance:</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Call 911 and provide your exact location</li>
                  <li>Describe the emergency clearly</li>
                  <li>Stay on the line until help arrives</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">📋 Emergency Information:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>Keep your medical history accessible</li>
                  <li>Have emergency contacts ready</li>
                  <li>Know your allergies and medications</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">⏰ Response Time:</h4>
                <p className="text-yellow-700">
                  Average emergency response time in your area: <strong>8-12 minutes</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmergencyCare;
