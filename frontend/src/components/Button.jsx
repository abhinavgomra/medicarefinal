import React from 'react';

const base = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md focus:ring-primary-600',
  secondary: 'bg-white text-primary-700 border border-primary-200 hover:bg-primary-50 focus:ring-primary-600',
  ghost: 'bg-transparent text-white border border-white/30 hover:bg-white/10 focus:ring-white'
};
const sizes = {
  md: 'px-5 py-2 text-sm font-semibold',
  lg: 'px-7 py-3 text-base font-semibold'
};

export const Button = ({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) => {
  const isDisabled = disabled || loading;
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className} ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={isDisabled} {...props}>
      {loading ? 'Please wait…' : children}
    </button>
  );
};

export default Button;


