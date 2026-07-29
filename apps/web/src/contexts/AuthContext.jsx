import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api('/auth/me')
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setInitialLoading(false));
  }, []);

  const adminLogin = useCallback(async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username dan password wajib diisi.');
      }
      const authData = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (authData.user) setCurrentUser(authData.user);
      return authData;
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw error;
    }
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    const authData = await api('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    setCurrentUser(authData.user);
    return authData;
  }, []);

  const adminLogout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('[AuthContext] Logout failed:', error);
      toast.error('Failed to logout properly');
    }
  }, []);

  const getCurrentUser = useCallback(() => currentUser, [currentUser]);
  
  const isAdmin = useCallback(() => {
    return currentUser?.role === 'admin';
  }, [currentUser]);

  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser, 
        adminLogin, 
        verifyTwoFactor,
        adminLogout, 
        getCurrentUser, 
        isAdmin, 
        isAuthenticated, 
        initialLoading 
      }}
    >
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
