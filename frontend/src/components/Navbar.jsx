import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-primary border-b border-primary-dark/30 px-6 flex items-center justify-between text-white shrink-0 shadow-sm z-30">
      {/* Brand Logo in Navbar */}
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="font-heading text-lg font-bold tracking-tight text-secondary">
          CivicFix
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* In-app Notification Dropdown */}
        <NotificationDropdown />
        
        {/* User profile capsule */}
        <div className="h-8 w-px bg-primary-light/50" />
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-secondary leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-300 capitalize mt-0.5">{user?.role === 'staff' ? `${user?.department_details?.name || 'Staff'}` : user?.role}</p>
          </div>
          
          <div className="relative group">
            <button className="h-9 w-9 bg-primary-light hover:bg-primary-dark rounded-full flex items-center justify-center border border-secondary/20 transition-all">
              <span className="text-sm font-bold text-secondary">{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
            </button>
            
            {/* Hover Profile Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-cream border border-primary/10 rounded-xl shadow-lg py-1.5 hidden group-hover:block z-50 text-slate-700">
              <div className="px-4 py-2 border-b border-primary/5">
                <p className="text-xs font-bold text-primary truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
