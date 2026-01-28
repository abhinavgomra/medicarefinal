import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { logout, isAuthenticated } from '../utils/auth';
import routes from '../route';

// Replaced link-heavy navbar with a clean top bar: logo, quick search, auth

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Show all main links in the top bar (desktop)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-3">
          <Link to="/" className="text-2xl font-bold text-primary-700 flex items-center shrink-0">
            <UserIcon className="h-8 w-8 mr-2 text-primary-500" />
            MediCare
          </Link>

          <div className="flex-1 hidden md:flex">
            <form
              onSubmit={(e) => { e.preventDefault(); if (query.trim()) navigate(`/doctor-finder?q=${encodeURIComponent(query.trim())}`); }}
              className="w-full"
            >
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctors, specialties…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </form>
          </div>

          <div className="hidden md:flex items-center space-x-3 shrink-0">
            {isAuthenticated() ? (
              <button
                onClick={handleLogout}
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary-600"
            >
              {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-3 mb-3 space-y-2 rounded-2xl border border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 shadow-md">
            <form
              onSubmit={(e) => { e.preventDefault(); if (query.trim()) { navigate(`/doctor-finder?q=${encodeURIComponent(query.trim())}`); setIsOpen(false); } }}
              className="px-4 pt-3"
            >
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctors, specialties…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </form>
            <div className="pt-1">
              {routes
                .filter(r => (r.protected ? isAuthenticated() : true))
                .map((r) => (
                  <Link
                    key={r.path}
                    to={r.path}
                    className={`block px-4 py-2 rounded ${location.pathname === r.path ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700'}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {r.name}
                  </Link>
                ))}
            </div>
            {isAuthenticated() ? (
              <button
                onClick={() => { setIsOpen(false); handleLogout(); }}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="block px-5 py-2 text-primary-600 hover:bg-primary-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
