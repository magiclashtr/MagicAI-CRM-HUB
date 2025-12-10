

import React from 'react';
import { NavItem, Currency } from '../types';
import { USD_TO_TRY_RATE } from '../constants';
import { motion } from 'framer-motion';

interface HeaderProps {
  activeItem: NavItem;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onMenuClick: () => void;
  onVoiceCommand: () => void;
  isGuest?: boolean;
  onRegister?: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeItem, currency, setCurrency, onMenuClick, onVoiceCommand, isGuest, onRegister }) => {
  const pageTitles: Record<NavItem, string> = {
    'dashboard': 'Панель керування',
    'training': 'Навчання',
    'course-preparation': 'Підготовка до курсів',
    'finance': 'Фінанси',
    'tasks': 'Завдання',
  };

  const title = pageTitles[activeItem] || 'Dashboard';

  const CurrencyControls = () => (
    <div className="flex items-center space-x-3 bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-sm">
      <span className="text-xs text-gray-400 pl-3 pr-2 font-mono hidden md:inline">
        $1 = {USD_TO_TRY_RATE} TRY
      </span>
      <div className="flex items-center gap-1">
        {['USD', 'TRY'].map((curr) => (
          <motion.button
            key={curr}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrency(curr as Currency)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${currency === curr
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            {curr}
          </motion.button>
        ))}
      </div>
    </div>
  );

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="p-4 sm:p-6 sticky top-0 z-10 mx-6 mt-4 rounded-2xl glass-panel border border-white/10"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={onMenuClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </motion.button>

          <div className="flex flex-col">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {title}
            </h1>
            <p className="text-xs text-indigo-300/60 hidden sm:block">
              MagicAI CRM Hub v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isGuest && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRegister}
              className="hidden lg:flex px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 text-xs font-bold uppercase tracking-wider items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              Доступ до курсів
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onVoiceCommand}
            className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:border-indigo-400/50 transition-all shadow-lg shadow-indigo-500/10"
            title="Start AI Voice Command"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 5.25v-1.5m-12 0v-1.5m12 0a9 9 0 0 0-9-9.75M12 4.5v1.5m0-1.5a9 9 0 0 1 9 9.75M12 4.5a9 9 0 0 0-9 9.75m16.5 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </motion.button>

          <div className="hidden sm:block">
            <CurrencyControls />
          </div>
        </div>
      </div>

      {/* Mobile Currency Controls */}
      <div className="sm:hidden flex justify-center items-center pt-4 mt-4 border-t border-white/5">
        <CurrencyControls />
      </div>
    </motion.header>
  );
};

export default Header;