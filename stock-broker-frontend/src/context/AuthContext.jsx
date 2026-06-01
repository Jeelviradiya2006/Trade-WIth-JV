import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronize user balance and basic details
  const syncUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // By calling GET /portfolio, we get verified profile info and the most updated balance
      const response = await api.get('/portfolio');
      if (response.data && response.data.user) {
        setUser({
          name: response.data.user.name,
          email: response.data.user.email,
          balance: response.data.user.balance,
        });
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      // Clear invalid credentials
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUser();
  }, []);

  // Register
  const register = async (name, email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, name: uName, email: uEmail, balance } = response.data;
      
      localStorage.setItem('token', token);
      setUser({ name: uName, email: uEmail, balance });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Login
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, name, email: uEmail, balance } = response.data;
      
      localStorage.setItem('token', token);
      setUser({ name, email: uEmail, balance });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        syncUser,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
