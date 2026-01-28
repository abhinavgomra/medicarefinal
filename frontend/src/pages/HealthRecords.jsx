import React, { useState } from 'react';
import { Card, CardContent, CardTitle } from '../components/Card';
import { DocumentTextIcon, CalendarIcon, UserIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import { PageTransition } from '../components/PageTransition';
import { motion } from 'framer-motion';

const HealthRecords = () => {
  const [activeTab, setActiveTab] = useState('all');

  const records = [
    {
      id: 1,
      type: 'Medical History',
      category: 'history',
      date: '2024-01-15',
      doctor: 'Dr. Sarah Johnson',
      specialty: 'Cardiology',
      description: 'Annual Physical Examination & Cardiac Stress Test',
      status: 'Completed'
    },
    {
      id: 2,
      type: 'Lab Results',
      category: 'lab',
      date: '2024-01-10',
      doctor: 'Lab Corp',
      description: 'Comprehensive Metabolic Panel (CMP) & Lipid Profile',
      status: 'Available'
    },
    {
      id: 3,
      type: 'Prescription',
      category: 'prescription',
      date: '2024-01-08',
      doctor: 'Dr. Michael Chen',
      specialty: 'Pediatrics',
      description: 'Amoxicillin 500mg - 10 Day Course',
      status: 'Active'
    },
    {
      id: 4,
      type: 'Vaccination',
      category: 'prevention',
      date: '2023-11-20',
      doctor: 'City Health Clinic',
      description: 'Influenza Vaccine (Flu Shot) 2023-2024',
      status: 'Completed'
    }
  ];

  const filteredRecords = activeTab === 'all' ? records : records.filter(r => r.category === activeTab);

  const tabs = [
    { id: 'all', label: 'All Records' },
    { id: 'history', label: 'Visits' },
    { id: 'lab', label: 'Labs' },
    { id: 'prescription', label: 'Rx' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              Health Records
            </motion.h1>
            <p className="text-xl text-gray-600">Secure access to your complete medical history.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Tabs */}
              <div className="flex space-x-2 overflow-x-auto pb-2 noscrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200"></div>
                <div className="space-y-6">
                  {filteredRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative pl-16 group"
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${record.category === 'lab' ? 'bg-purple-500' :
                          record.category === 'prescription' ? 'bg-green-500' :
                            'bg-primary-500'
                        }`} />

                      <Card className="group-hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 ${record.category === 'lab' ? 'bg-purple-100 text-purple-700' :
                                  record.category === 'prescription' ? 'bg-green-100 text-green-700' :
                                    'bg-primary-100 text-primary-700'
                                }`}>
                                {record.type}
                              </span>
                              <h3 className="text-lg font-bold text-gray-900">{record.description}</h3>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-sm text-gray-500 mb-1">
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                {record.date}
                              </div>
                              <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
                                {record.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center text-sm text-gray-600">
                              <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-medium">{record.doctor}</span>
                              {record.specialty && <span className="text-gray-400 ml-1">• {record.specialty}</span>}
                            </div>
                            <div className="flex space-x-2">
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="Download">
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="Share">
                                <ShareIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <Card variant="glass" className="sticky top-24">
                <CardContent className="p-6">
                  <CardTitle className="mb-6">Health Overview</CardTitle>

                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-100">
                      <h4 className="font-semibold text-blue-900 mb-1">Last Checkup</h4>
                      <p className="text-blue-700 font-medium">Jan 15, 2024</p>
                      <p className="text-sm text-blue-600 mt-1">Dr. Sarah Johnson (Cardiology)</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-100">
                      <h4 className="font-semibold text-green-900 mb-1">Active Prescriptions</h4>
                      <ul className="text-green-700 text-sm space-y-1 mt-2">
                        <li className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                          Amoxicillin (Ends Jan 18)
                        </li>
                        <li className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                          Vitamin D Supplement
                        </li>
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-4 rounded-xl border border-yellow-100">
                      <h4 className="font-semibold text-yellow-900 mb-1">Allergies</h4>
                      <p className="text-yellow-700 text-sm">No known drug allergies.</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
                    <button className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm mb-3 shadow-sm">
                      Request Medical Report
                    </button>
                    <button className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm">
                      Upload New Document
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default HealthRecords;