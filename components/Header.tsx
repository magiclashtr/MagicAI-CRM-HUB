

import React from 'react';
import { NavItem, Currency } from '../types';
import { USD_TO_TRY_RATE } from '../constants';

interface HeaderProps {
  activeItem: NavItem;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  onMenuClick: () => void;
  onVoiceCommand: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeItem, currency, setCurrency, onMenuClick, onVoiceCommand }) => {
  const pageTitles: Record<NavItem, string> = {
    'dashboard': 'Панель керування',
    'training': 'Навчання',
    'course-preparation': 'Підготовка до курсів',
    'finance': 'Фінанси',
    'tasks': 'Завдання',
  };

  const title = pageTitles[activeItem] || 'Dashboard';

  const CurrencyControls = () => (
    <div className="flex items-center space-x-2">
        <div className="text-xs text-gray-400 whitespace-nowrap">
            $1 = {USD_TO_TRY_RATE} TRY
        </div>
        <div className="flex items-center bg-gray-700 rounded-full p-1 text-sm">
        <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 rounded-full ${currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
        >
            USD
        </button>
        <button
            onClick={() => setCurrency('TRY')}
            className={`px-3 py-1 rounded-full ${currency === 'TRY' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
        >
            TRY
        </button>
        </div>
    </div>
  );

  return (
    <header className="p-4 bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
      {/* Top row for all screen sizes */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button className="lg:hidden text-gray-400 hover:text-white mr-4" onClick={onMenuClick}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={onVoiceCommand} className="p-2 rounded-full hover:bg-gray-700" title="Voice Command (toggles GenAI Magic)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 5.25v-1.5m-12 0v-1.5m12 0a9 9 0 0 0-9-9.75M12 4.5v1.5m0-1.5a9 9 0 0 1 9 9.75M12 4.5a9 9 0 0 0-9 9.75m16.5 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </button>
          {/* Desktop Currency Controls */}
          <div className="hidden sm:flex">
             <CurrencyControls />
          </div>
        </div>
      </div>
      {/* Mobile Currency Controls */}
      <div className="sm:hidden flex justify-center items-center pt-3 mt-3 border-t border-gray-700/50">
        <CurrencyControls />
      </div>
    </header>
  );
};

export default Header;