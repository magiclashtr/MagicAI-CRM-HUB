import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 ease-in-out flex items-center justify-center';
  let variantStyles: string;
  let sizeStyles: string;

  switch (variant) {
    case 'primary':
      variantStyles = 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/30 border border-indigo-500/50';
      break;
    case 'secondary':
      variantStyles = 'bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700';
      break;
    case 'danger':
      variantStyles = 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30';
      break;
    case 'outline':
      variantStyles = 'border-2 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400';
      break;
    case 'ghost':
      variantStyles = 'text-gray-400 hover:text-white hover:bg-white/5';
      break;
    case 'glass':
      variantStyles = 'backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg';
      break;
    default:
      variantStyles = 'bg-indigo-600 hover:bg-indigo-700 text-white';
  }

  switch (size) {
    case 'sm':
      sizeStyles = 'px-3 py-1.5 text-xs';
      break;
    case 'md':
      sizeStyles = 'px-5 py-2.5 text-sm';
      break;
    case 'lg':
      sizeStyles = 'px-6 py-3 text-base';
      break;
    default:
      sizeStyles = 'px-5 py-2.5 text-sm';
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className} ${props.disabled || isLoading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
      disabled={props.disabled || isLoading}
      {...props as HTMLMotionProps<"button">}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {icon && <span className={`flex items-center ${children ? 'mr-2' : ''}`}>{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default Button;