import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists in localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt storage
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', { email, password });
      
      const { access, refresh, user: userData } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      localStorage.clear();
      setUser(null);
      
      const errorMsg = error.response?.data?.detail || 'Invalid email or password.';
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, phone, password, confirmPassword, role = 'citizen') => {
    try {
      const response = await api.post('/auth/register/', {
        name,
        email,
        phone,
        password,
        confirm_password: confirmPassword,
        role,
      });
      return { success: true, data: response.data };
    } catch (error) {
      // Extract first validation error key
      let errorMsg = 'Failed to register account.';
      if (error.response?.data) {
        const errors = error.response.data;
        const firstKey = Object.keys(errors)[0];
        if (firstKey) {
          const val = errors[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : val;
        }
      }
      return { success: false, error: errorMsg };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile/', profileData);
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update profile details.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
