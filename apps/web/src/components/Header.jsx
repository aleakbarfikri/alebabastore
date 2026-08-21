import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router.jsx';
import { Menu, X, Gamepad2, LogIn, LogOut, LayoutDashboard, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              ALEBABA STORE
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Home
            </Link>
            <Link
              to="/listings"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/listings') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Browse Games
            </Link>

            <div className="w-px h-6 bg-border mx-2"></div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={isAdmin() ? '/admin' : '/inbox'}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all flex items-center gap-2"
                >
                  {isAdmin() ? <LayoutDashboard className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  {isAdmin() ? 'Dashboard' : 'Inbox OTP'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <nav className="px-4 py-4 space-y-2">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive('/') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Home
              </Link>
              <Link
                to="/listings"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive('/listings') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Browse Games
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to={isAdmin() ? '/admin' : '/inbox'}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl font-medium bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    {isAdmin() ? <LayoutDashboard className="w-4 h-4 inline mr-2" /> : <Mail className="w-4 h-4 inline mr-2" />}
                    {isAdmin() ? 'Dashboard' : 'Inbox OTP'}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <LogIn className="w-4 h-4 inline mr-2" />
                  Login
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
