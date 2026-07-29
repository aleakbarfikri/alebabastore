import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link, useNavigate } from '@/lib/router.jsx';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, TrendingUp, Shield, Zap, Castle, Copy, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import AccountImageGallery from '@/components/AccountImageGallery.jsx';
import ReviewSection from '@/components/ReviewSection.jsx';
import { useGameAccounts } from '@/hooks/useGameAccounts.js';
import { toast } from 'sonner';

const AccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchAccountById } = useGameAccounts();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    setLoading(true);
    setError(null);
    
    fetchAccountById(id)
      .then((data) => {
        if (isMounted) {
          setAccount(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[AccountDetailPage] Error fetching account:', err);
          setError('Failed to load account details. The account may have been removed or is currently unavailable.');
          setLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [id, fetchAccountById]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const copyCode = () => {
    if (account?.account_code) {
      navigator.clipboard.writeText(account.account_code);
      toast.success(`Kode ${account.account_code} berhasil disalin!`);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground font-medium">Memuat detail akun...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !account) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Akun tidak ditemukan</h2>
            <p className="text-muted-foreground mb-8">{error || 'Akun yang Anda cari tidak tersedia.'}</p>
            <Link 
              to="/listings" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors w-full"
            >
              Kembali ke daftar akun
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${account.title || account.game_name} Level ${account.level} - ALEBABA STORE`}</title>
        <meta name="description" content={account.description} />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke daftar akun
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AccountImageGallery account={account} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="sticky top-24">
                
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                    {account.game_name}
                  </div>
                  
                  {account.account_code && (
                    <div className="account-code-badge">
                      <span>{account.account_code}</span>
                      <button onClick={copyCode} className="account-code-copy-btn" aria-label="Copy account code">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ letterSpacing: '-0.02em', textBalance: 'balance' }}>
                  {account.title || `Akun ${account.game_name}`}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-lg font-semibold">Level {account.level}</span>
                  </div>
                  
                  {account.game_name === 'Clash of Clans' && account.townhall_level && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg">
                      <Castle className="w-5 h-5" />
                      <span className="text-lg font-semibold">TownHall Level: {account.townhall_level}</span>
                    </div>
                  )}

                  {account.rank && (
                    <div className="px-3 py-1.5 bg-muted border border-border/50 rounded-lg">
                      <span className="text-base font-medium text-foreground">{account.rank}</span>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground mb-3">Deskripsi</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{account.description}</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Harga</span>
                    <span className="text-3xl font-bold text-accent">{formatPrice(account.price)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/upload?account=${encodeURIComponent(account.id)}`)}
                  disabled={account.sold}
                  className={`w-full px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 mb-4 ${
                    account.sold 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90 gaming-glow-secondary active:scale-[0.98]'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  {account.sold ? 'Akun Telah Terjual' : 'Beli dengan QRIS'}
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted border border-border/50 rounded-xl">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Transaksi</p>
                      <p className="text-sm font-bold text-foreground">100% Aman</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted border border-border/50 rounded-xl">
                    <Zap className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Proses</p>
                      <p className="text-sm font-bold text-foreground">Instan</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ReviewSection gameAccountId={account.id} />
          </motion.div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AccountDetailPage;
