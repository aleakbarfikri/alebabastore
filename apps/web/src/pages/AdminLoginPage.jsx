import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authData = await adminLogin(formData.email, formData.password);
      
      if (authData.record.role !== 'admin') {
        setError('Access Denied. Admin privileges required.');
        pb.authStore.clear(); 
        setLoading(false);
        return;
      }

      toast.success('Admin login successful');
      navigate('/admin');
    } catch (err) {
      console.error('[AdminLoginPage] Login error:', err);
      setError('Invalid email or password. Please try again.');
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Login - ALEBABA STORE</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Restricted Access</h1>
            <p className="text-muted-foreground">Please sign in to the admin console.</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter authorized email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 mt-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign in to Console
                  </>
                )}
              </button>
            </form>
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-8">
            Unauthorized access to this portal is strictly prohibited.
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLoginPage;