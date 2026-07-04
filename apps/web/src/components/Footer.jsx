import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Mail, Phone, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center gaming-glow">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-card-foreground">ALEBABA STORE</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform terpercaya untuk jual beli akun game Mobile Legends, Free Fire, dan Clash of Clans.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-card-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Beranda
                </Link>
              </li>
              <li>
                <Link to="/listings" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Akun Game
                </Link>
              </li>
              <li>
                <Link to="/upload" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Upload Bukti
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-card-foreground mb-4">Hubungi Kami</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/6285129292922"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: 085129292922</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@alebaba.com"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>info@alebaba.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 ALEBABA STORE. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;