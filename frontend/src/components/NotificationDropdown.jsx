import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Eye } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data.results || res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new alerts
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast("All notifications marked as read.", "success");
    } catch (err) {
      showToast("Failed to mark all as read.", "error");
    }
  };

  const markIndividualRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-secondary hover:text-white rounded-lg hover:bg-primary-light transition-all focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 border-2 border-primary text-[10px] font-bold text-white rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-cream rounded-xl shadow-lg border border-primary/10 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-primary border-b border-primary/20">
            <h3 className="text-sm font-semibold text-secondary font-sans">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-bold text-secondary hover:text-white transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-72 overflow-y-auto divide-y divide-primary/5">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markIndividualRead(notif.id)}
                  className={`p-4 transition-colors hover:bg-primary/5 cursor-pointer ${
                    !notif.is_read ? 'bg-primary/[0.02]' : ''
                  }`}
                >
                  <p className={`text-xs text-slate-800 leading-relaxed ${!notif.is_read ? 'font-semibold' : ''}`}>
                    {notif.message}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {notif.complaint && (
                      <Link
                        to={currentUser?.role === 'staff' ? `/dept/complaint/${notif.complaint}` : `/complaint/${notif.complaint}`}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        onClick={() => setIsOpen(false)}
                      >
                        <Eye className="w-3 h-3" /> View Issue
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
