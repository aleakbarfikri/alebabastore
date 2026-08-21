import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const authGeneration = useRef(0);

  useEffect(() => {
    const generation = authGeneration.current;
    api('/auth/me')
      .then(({ user }) => {
        if (authGeneration.current === generation) setCurrentUser(user);
      })
      .catch(() => {
        if (authGeneration.current === generation) setCurrentUser(null);
      })
      .finally(() => {
        if (authGeneration.current === generation) setInitialLoading(false);
      });

    return () => {
      authGeneration.current += 1;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    const generation = ++authGeneration.current;
    setInitialLoading(false);
    try {
      if (!identifier || !password) {
        throw new Error('Email/username dan password wajib diisi.');
      }
      const authData = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (authGeneration.current === generation && authData.user) setCurrentUser(authData.user);
      return authData;
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw error;
    }
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    const generation = ++authGeneration.current;
    setInitialLoading(false);
    const authData = await api('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (authGeneration.current === generation) setCurrentUser(authData.user);
    return authData;
  }, []);

  const logout = useCallback(async () => {
    ++authGeneration.current;
    setInitialLoading(false);
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
        login,
        adminLogin: login,
        verifyTwoFactor,
        logout,
        adminLogout: logout,
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
