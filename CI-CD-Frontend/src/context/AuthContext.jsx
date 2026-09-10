import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-load user profile if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get('/auth/profile');
        if (data.success) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Auto-login failed:', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (fullName, email, password, role) => {
    setError(null);
    try {
      const data = await api.post('/auth/register', { fullName, email, password, role });
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const setTokenWithLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // User will be loaded automatically by the useEffect
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, setTokenWithLogin, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
