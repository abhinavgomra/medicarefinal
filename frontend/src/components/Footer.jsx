import React from 'react';
import { HeartIcon, PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">MediCare</h3>
            <p className="text-gray-400">
              Your trusted digital health companion. Providing comprehensive healthcare solutions at your fingertips.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/telemedicine" className="hover:text-white">Telemedicine</Link></li>
              <li><Link to="/doctor-finder" className="hover:text-white">Find a Doctor</Link></li>
              <li><Link to="/pharmacy" className="hover:text-white">Pharmacy</Link></li>
              <li><Link to="/emergency-care" className="hover:text-white">Emergency Care</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 mr-2" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                <span>support@medicare.com</span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                <span>123 Health Street, Medical City</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 flex items-center">
            <HeartIcon className="h-5 w-5 text-red-400 mr-1" />
            Made with love for better health
          </p>
          <p className="text-gray-400 mt-4 md:mt-0">
            © 2024 MediCare. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
