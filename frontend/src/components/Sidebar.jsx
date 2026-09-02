import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Map, 
  User, 
  Users, 
  Building2, 
  LogOut,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role || 'citizen';

  // Config links depending on role
  const citizenLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Report Issue', path: '/report', icon: <PlusCircle className="w-5 h-5" /> },
    { name: 'My Complaints', path: '/my-complaints', icon: <FileText className="w-5 h-5" /> },
    { name: 'Map View', path: '/map', icon: <Map className="w-5 h-5" /> },
    { name: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  const staffLinks = [
    { name: 'Dashboard', path: '/dept/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Assigned Issues', path: '/dept/complaints', icon: <FileText className="w-5 h-5" /> },
    { name: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Manage Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { name: 'Departments', path: '/admin/departments', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Complaints', path: '/admin/complaints', icon: <FileText className="w-5 h-5" /> },
    { name: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  const getLinks = () => {
    switch (role) {
      case 'admin':
        return adminLinks;
      case 'staff':
        return staffLinks;
      default:
        return citizenLinks;
    }
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-primary shrink-0 flex flex-col h-full text-white shadow-md border-r border-primary-dark/25">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-primary-dark/20 flex items-center gap-3">
        <svg className="w-8 h-8 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <div>
          <h1 className="font-heading font-extrabold text-xl leading-none text-secondary tracking-tight">CivicFix</h1>
          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1">Report. Track. Resolve.</p>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-secondary text-primary font-bold shadow-md shadow-black/10' 
                  : 'text-slate-200 hover:bg-primary-light hover:text-white hover:translate-x-1'
              }`
            }
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-primary-dark/25">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-rose-300 hover:bg-rose-950 hover:text-rose-200 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
