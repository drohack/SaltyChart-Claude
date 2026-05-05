import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SettingsModal from './SettingsModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 hc:bg-black text-gray-900 dark:text-gray-100 hc:text-white transition-colors">
      <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 hc:border-white bg-white dark:bg-gray-950 hc:bg-black">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400 hc:text-white shrink-0">
            SaltyChart
          </span>

          <div className="flex items-center gap-1 text-sm font-medium">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/randomize"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`
              }
            >
              Randomize
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`
              }
            >
              Compare
            </NavLink>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign in
              </NavLink>
            )}
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
