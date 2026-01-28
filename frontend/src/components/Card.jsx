import React from 'react';

export const Card = ({ children, className = '', variant = 'default', hover = true, ...props }) => {
  const variants = {
    default: 'bg-white shadow-md',
    glass: 'bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm',
    outline: 'bg-white border border-gray-200 shadow-sm'
  };
  const hoverClass = hover ? 'hover:shadow-xl hover:-translate-y-[2px]' : '';
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-300 transform ${variants[variant]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-xl font-semibold text-gray-800 ${className}`}>
      {children}
    </h3>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
};