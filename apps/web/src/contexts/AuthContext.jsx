import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        setCurrentUser(pb.authStore.model);
      }
    } catch (error) {
      console.error('[AuthContext] Initial auth check failed:', error);
      pb.authStore.clear();
    } finally {
      setInitialLoading(false);
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        setCurrentUser(model);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      setCurrentUser(authData.record);
      return authData;
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw error;
    }
  }, []);

  const adminLogout = useCallback(() => {
    try {
      pb.authStore.clear();
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

  const isAuthenticated = pb.authStore.isValid && currentUser !== null;

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser, 
        adminLogin, 
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