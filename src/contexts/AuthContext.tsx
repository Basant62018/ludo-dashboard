import React, { createContext, useContext, useEffect, useState } from 'react';
import { Admin, getAdmin, isAuthenticated, logout as authLogout } from '../utils/auth';

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  login: (admin: Admin, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        const adminData = getAdmin();
        setAdmin(adminData);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (adminData: Admin, token: string) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = () => {
    authLogout();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        login,
        logout,
        isAuthenticated: isAuthenticated(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};