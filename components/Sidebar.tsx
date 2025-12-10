import React from 'react';
import { NavItem } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeItem: NavItem;
  setActiveItem: (item: NavItem) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onToggleChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem, isOpen, setIsOpen, onToggleChat }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Панель керування', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg>, key: 'dashboard' as NavItem },
    { name: 'Навчання', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.902a48.627 48.627 0 0 1 8.232-4.408 60.426 60.426 0 0 0-.491-6.347m-15.482 0l1.391-.521A11.233 11.233 0 0 1 12 9.80c4.833 0 8.842 3.047 10.687 7.256v2.271m-15.482 0zM12 18.807v2.095m0-11.758V7.5M6 10.147l2.28-2.28m4.26-2.262 2.28 2.28M18 10.147l-2.28-2.28" /></svg>, key: 'training' as NavItem },
    { name: 'Підготовка до курсів', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.354 11.354a2.25 2.25 0 0 0 0 3.182m-6.75 2.25a2.25 2.25 0 0 0 0 3.182c4.142 4.143 10.887 4.143 15.03 0 .115-.115.225-.233.33-.35L19.5 15.75c-1.254-1.254-3.045-1.554-4.385-1.036-.054.021-.106.04-.158.06M11.354 11.354L19.5 15.75m-6.75 2.25c1.026.096 1.859-.444 2.379-1.35M11.354 11.354c.767.18 1.45.418 2.083.716m-12.24-10.424A5.25 5.25 0 0 1 12 2.25h.575a2.25 2.25 0 0 1 0 4.5H12.75V12A2.25 2.25 0 0 1 10.5 14.25H5.25A2.25 2.25 0 0 1 3 12V5.25C3 4.112 3.912 3.25 5.06 3.25Z" /></svg>, key: 'course-preparation' as NavItem },
    { name: 'AI-Mira', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m9 11.25 3-3m0 0 3 3m-3-3v8.25M12 18a.75.75 0 0 1-.75.75H5.25A2.25 2.25 0 0 1 3 16.5V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v6.75A2.25 2.25 0 0 1 18.75 14.25H13.5a.75.75 0 0 1-.75-.75V18Z" /></svg>, key: 'genai-magic' },
    { name: 'Фінанси', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.795 2.104c.207.055.426-.038.64-.243L21 16.5m-19.5 2.25-.97.485A11.217 11.217 0 0 0 4.5 20.25a11.217 11.217 0 0 0 9.75-5.625V12a4.5 4.5 0 0 0-.75-2.25H9.75A4.5 4.5 0 0 0 12 9.75v-.938l-4.757-1.192A6.75 6.75 0 0 0 3 6.75V5.25m18.75 13.5c.231.026.469-.035.688-.184a2.913 2.913 0 0 0 1.188-1.733V9.75a3 3 0 0 0-3-3h-3.375c-.36 0-.695.112-.974.324 0 0-.425.334-.67.608-.25.275-.505.474-.78.653m-15.75 0h-.0077c-.453 0-.89.16-1.226.46a3.242 3.242 0 0 0-.641 1.06V9.75" /></svg>, key: 'finance' as NavItem },
    { name: 'Завдання', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75M12 6.75h4.5M12 19.5h4.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, key: 'tasks' as NavItem },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  // Filter items for guest mode
  const displayedNavItems = user
    ? navItems
    : navItems.filter(item => ['dashboard', 'training', 'genai-magic'].includes(item.key));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial="closed"
        animate={isOpen ? "open" : (window.innerWidth >= 1024 ? "open" : "closed")}
        variants={sidebarVariants}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 h-full w-64 p-6 flex flex-col z-30
                   glass-panel border-r border-white/10 rounded-none lg:translate-x-0`}
        style={{ background: 'rgba(15, 12, 41, 0.7)' }} // Override glass-panel bg for better readability in sidebar
      >
        <div className="flex justify-between items-center mb-8 relative">
          {/* Logo Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-25"></div>
          <div className="relative text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-500">
            MagicAI
          </div>

          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {displayedNavItems.map((item) => (
            <motion.button
              key={item.key}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.key === 'genai-magic') {
                  onToggleChat();
                } else {
                  setActiveItem(item.key as NavItem);
                }
                setIsOpen(false);
              }}
              className={`flex items-center w-full p-3 rounded-xl text-left transition-all duration-300 relative overflow-hidden group
                ${activeItem === item.key
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {activeItem === item.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-100 rounded-xl -z-10"
                />
              )}
              <span className={`mr-3 ${activeItem === item.key ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-300'}`}>{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </motion.button>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto pt-4 border-t border-white/10">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full border-2 border-indigo-500/50" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 font-semibold truncate text-sm">{user.name}</p>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    <p className="text-xs text-gray-400 truncate capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2.5 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Вийти
              </motion.button>
            </div>
          ) : (
            <div className="text-center p-4 glass-panel bg-white/5 border border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-gray-300 text-sm mb-2 font-medium">Ваш статус: Гість</p>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Зареєструйтесь, щоб отримати доступ до всіх курсів та можливостей.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                Отримати доступ
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;