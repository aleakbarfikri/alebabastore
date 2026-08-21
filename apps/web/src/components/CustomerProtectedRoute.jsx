import React from 'react';
import { Navigate } from '@/lib/router.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function CustomerProtectedRoute({ children }) {
  const { currentUser, initialLoading } = useAuth();
  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Memuat sesi...</div>;
  }
  if (currentUser?.role !== 'customer') return <Navigate to="/login" replace />;
  return children;
}
