import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, isDoctor } from '../utils/auth';

export const DoctorRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isDoctor()) return <Navigate to="/" replace />;
  return children;
};

