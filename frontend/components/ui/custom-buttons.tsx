import React from 'react';
import { Button } from './button';

interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<StyledButtonProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-2 text-white font-medium rounded-lg 
                 bg-gradient-to-r from-blue-500 to-indigo-600 
                 hover:from-blue-600 hover:to-indigo-700
                 shadow-lg hover:shadow-xl 
                 transition-all duration-300 
                 transform hover:scale-[1.03] hover:translate-y-[-2px] 
                 disabled:opacity-50 disabled:cursor-not-allowed
                 relative 
                 ${className || ''}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 opacity-0 hover:opacity-100 bg-[radial-gradient(circle,_rgba(59,130,246,0.3)_0%,_transparent_70%)] rounded-lg transition-opacity duration-300"></span>
    </button>
  );
};

export const DangerButton: React.FC<StyledButtonProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-2 text-white font-medium rounded-lg
                 bg-gradient-to-r from-red-500 to-pink-600 
                 hover:from-red-600 hover:to-pink-700
                 shadow-lg hover:shadow-xl 
                 transition-all duration-300 
                 transform hover:scale-[1.03] hover:translate-y-[-2px] 
                 relative
                 ${className || ''}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 opacity-0 hover:opacity-100 bg-[radial-gradient(circle,_rgba(239,68,68,0.3)_0%,_transparent_70%)] rounded-lg transition-opacity duration-300"></span>
    </button>
  );
};

export const OutlineButton: React.FC<StyledButtonProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-2 bg-white border-2 border-gray-300 
                 hover:border-gray-400 font-medium rounded-lg
                 shadow hover:shadow-md 
                 transition-all duration-300 
                 transform hover:scale-[1.03] hover:translate-y-[-2px]
                 ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const PurpleButton: React.FC<StyledButtonProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <button
      className={`px-4 py-2 text-white font-medium rounded-lg
                 bg-gradient-to-r from-indigo-600 to-purple-600 
                 hover:from-indigo-700 hover:to-purple-700
                 shadow-lg hover:shadow-xl 
                 transition-all duration-300 
                 transform hover:scale-[1.02] hover:translate-y-[-2px] 
                 relative
                 ${className || ''}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 opacity-0 hover:opacity-100 bg-[radial-gradient(circle,_rgba(139,92,246,0.3)_0%,_transparent_70%)] rounded-lg transition-opacity duration-300"></span>
    </button>
  );
}; 