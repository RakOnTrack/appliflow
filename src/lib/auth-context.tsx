'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '@/lib/api';

interface AuthContextType {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) setToken(saved);
    setLoaded(true);
  }, []);

  const login = async (email: string, password: string) => {
    const t = await apiLogin({ email, password });
    localStorage.setItem('token', t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!loaded) return null;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
