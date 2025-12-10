import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { NavItem, Currency } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeItem: NavItem;
  setActiveItem: (item: NavItem) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  // FIX: Updated the type of 'onVoiceCommand' to match the synchronous 'toggleChat' function passed from App.
  onVoiceCommand: () => void;
  onToggleChat: () => void;
  isGuest?: boolean;
  onRegister?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeItem, setActiveItem, currency, setCurrency, onVoiceCommand, onToggleChat, isGuest, onRegister }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900 text-gray-100">
      <Sidebar
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onToggleChat={onToggleChat} // Pass down
      />
      <div className="relative flex flex-col flex-1 w-full lg:ml-64 overflow-hidden">
        <Header
          activeItem={activeItem}
          currency={currency}
          setCurrency={setCurrency}
          onMenuClick={() => setIsSidebarOpen(true)}
          onVoiceCommand={onVoiceCommand}
          isGuest={isGuest}
          onRegister={onRegister}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;