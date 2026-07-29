import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';
import ScrollToTop from '@/components/ScrollToTop';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import HomePage from '@/pages/HomePage';
import GameListingPage from '@/pages/GameListingPage';
import AccountDetailPage from '@/pages/AccountDetailPage';
import UploadProofPage from '@/pages/UploadProofPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import PaymentStatusPage from '@/pages/PaymentStatusPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings" element={<GameListingPage />} />
            <Route path="/account/:id" element={<AccountDetailPage />} />
            <Route path="/upload" element={<UploadProofPage />} />
            <Route path="/payment-status" element={<PaymentStatusPage />} />
            
            {/* Unprotected Admin Login route */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            
            {/* Protected Admin Dashboard route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all 404 Route */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
                  <h1 className="text-6xl font-extrabold text-foreground mb-4">404</h1>
                  <p className="text-xl text-muted-foreground mb-8">Page not found</p>
                  <a href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all">
                    Back to Home
                  </a>
                </div>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
