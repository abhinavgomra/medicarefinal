import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ComputerDesktopIcon,
  PhoneArrowDownLeftIcon,
  BeakerIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import { isAuthenticated } from '../utils/auth';

const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon, protected: false },
  { path: '/telemedicine', label: 'Telemedicine', icon: ComputerDesktopIcon, protected: true },
  { path: '/emergency-care', label: 'Emergency Care', icon: PhoneArrowDownLeftIcon, protected: true },
  { path: '/pharmacy', label: 'Pharmacy', icon: BeakerIcon, protected: true },
  { path: '/symptom-checker', label: 'Symptoms', icon: HeartIcon, protected: true },
  { path: '/health-records', label: 'Health Records', icon: ClipboardDocumentListIcon, protected: true },
  { path: '/doctor-finder', label: 'Find Doctor', icon: UserGroupIcon, protected: true },
  { path: '/appointment-booking', label: 'Appointments', icon: CalendarDaysIcon, protected: true },
  { path: '/insurance-support', label: 'Insurance', icon: ShieldCheckIcon, protected: true },
  { path: '/profile', label: 'Profile', icon: UserCircleIcon, protected: true },
  { path: '/prescription-ocr', label: 'Prescription OCR', icon: DocumentTextIcon, protected: true },
  { path: '/voice-control', label: 'Voice Control', icon: MicrophoneIcon, protected: true },
];

const Sidebar = () => {
  const location = useLocation();
  const authed = isAuthenticated();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sidebarCollapsed', String(next)); } catch (_) {}
  };

  return (
    <aside className={`hidden md:block ${collapsed ? 'md:w-16' : 'md:w-56 lg:w-64'} shrink-0 border-r border-gray-100 bg-white`}>
      <div className="sticky top-[56px] max-h-[calc(100vh-56px)] overflow-y-auto p-2">
        <nav className="space-y-1">
          {navItems
            .filter(item => (item.protected ? authed : true))
            .map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  to={path}
                  key={path}
                  title={label}
                  className={`flex items-center gap-3 rounded-xl ${collapsed ? 'px-2 justify-center' : 'px-3'} py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-700'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
        </nav>
        <div className="h-3" />
        <div className="sticky bottom-2 pt-2">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {collapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


