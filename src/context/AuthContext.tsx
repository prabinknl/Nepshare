import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string; fullName: string }) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sharenep_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('sharenep_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (identifier: string, pass: string) => {
    const res = await api.login({ loginIdentifier: identifier, password: pass });
    localStorage.setItem('sharenep_token', res.token);
    setToken(res.token);
    setUser(res.user);
    closeAuthModal();
  };

  const register = async (payload: { username: string; email: string; password: string; fullName: string }) => {
    const res = await api.register(payload);
    localStorage.setItem('sharenep_token', res.token);
    setToken(res.token);
    setUser(res.user);
    closeAuthModal();
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    localStorage.setItem('sharenep_token', res.token);
    setToken(res.token);
    setUser(res.user);
    closeAuthModal();
  };

  const logout = () => {
    localStorage.removeItem('sharenep_token');
    setToken(null);
    setUser(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
