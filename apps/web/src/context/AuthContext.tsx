import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'senior' | 'family';
  phone?: string;
  preferredLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'senior' | 'family', phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('dp_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.tokens?.accessToken) {
      localStorage.setItem('dp_token', res.data.tokens.accessToken);
    }
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string, role: 'senior' | 'family', phone?: string) => {
    const res = await api.post('/auth/register', { name, email, password, role, phone });
    if (res.data.tokens?.accessToken) {
      localStorage.setItem('dp_token', res.data.tokens.accessToken);
    }
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('dp_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
