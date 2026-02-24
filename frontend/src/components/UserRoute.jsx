import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getTokenPayload, isAuthenticated } from '../utils/auth';

export const UserRoute = ({ children }) => {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const payload = getTokenPayload() || {};
  if (payload.role === 'doctor') {
    return <Navigate to="/doctor-portal" replace />;
  }
  if (payload.role === 'admin') {
    return <Navigate to="/admin/pharmacy" replace />;
  }
  return children;
};

