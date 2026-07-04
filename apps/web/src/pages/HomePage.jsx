import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import GameAccountCard from '@/components/GameAccountCard.jsx';
import { useGameAccounts } from '@/hooks/useGameAccounts.js';

const HomePage = () => {
  const {
    fetchAllAccounts,
    deleteAccount
  } = useGameAccounts();
  const [featuredAccounts, setFeaturedAccounts] = useState([]);

  const loadFeatured = async () => {
    try {
      const data = await fetchAllAccounts();
      setFeaturedAccounts(data.slice(0, 3));
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  useEffect(() => {
    loadFeatured();
  }, []);

  const handleDelete = async id => {
    try {
      await deleteAccount(id);
      toast.success('Akun berhasil dihapus');
      loadFeatured();
    } catch (error) {
      toast.error('Gagal menghapus akun');
    }
  };

  const gameCategories = [
    {
      name: 'Mobile Legends',
      logo: 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/5e22b25973f0b9f6ea6ffa37efb50aa3.jpg'
    }, 
    {
      name: 'Free Fire',
      logo: 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/8714b76871045b9a290379fe75c6cb56.jpg'
    }, 
    {
      name: 'Clash of Clans',
      logo: 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/ed3a5fde3e59f26dfdd2e2407e101dd7.jpg'
    }
  ];

  const features = [
    {
      icon: Shield,
      title: '100% Secure',
      description: 'Setiap transaksi dilindungi oleh sistem anti-fraud canggih kami.'
    }, 
    {
      icon: Zap,
      title: 'Instant Delivery',
      description: 'Terima data akun langsung setelah pembayaran dikonfirmasi.'
    }, 
    {
      icon: TrendingUp,
      title: 'Best Value',
      description: 'Harga paling kompetitif di pasar untuk akun-akun sultan.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>ALEBABA STORE - Jual Beli Game Account</title>
        <meta name="description" content="ALEBABA STORE - Platform Marketplace Terbaik Untuk Mobile Legends, Free Fire, dan Clash of Clans. Jual beli akun game dengan harga terbaik dan transaksi 100% aman." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        {/* Hero Section */}
        <section className="relative min-h-[90dvh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen">
            <img src="https://images.unsplash.com/photo-1585065736395-2cc8b27b244f?q=80&w=2070&auto=format&fit=crop" alt="Gaming Setup" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 leading-tight tracking-tight" style={{ textBalance: 'balance' }}>
                Dominate the game from <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">day one.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Platform Marketplace Terbaik Dengan Total Penjualan 1000+ Akun
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/listings" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xl shadow-primary/25 inline-flex items-center justify-center gap-2 group">
                  Browse Games
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories / Official Games Showcase Section */}
        <section className="py-24 bg-card/30 border-y border-border/50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Official Supported Games
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Pilih game favoritmu dan temukan akun sultan yang siap untuk mendominasi leaderboard.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {gameCategories.map((category, index) => (
                <motion.div key={category.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Link to={`/listings?game=${encodeURIComponent(category.name)}`} className="block group">
                    <div className="bg-card/40 backdrop-blur-sm border border-border rounded-[2.5rem] p-8 md:p-10 hover:bg-card hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-primary/10 flex flex-col items-center text-center h-full">
                      
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mb-8 rounded-[2rem] overflow-hidden border-4 border-black shadow-xl group-hover:scale-110 group-hover:shadow-primary/40 transition-all duration-500 ease-out relative bg-black p-2">
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay z-10"></div>
                        <img 
                          src={category.logo} 
                          alt={`${category.name} official logo`} 
                          className="logo-container relative z-0 rounded-xl" 
                        />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Listings */}
        {featuredAccounts.length > 0 && (
          <section className="py-24 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                    Featured Drops
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Akun sultan pilihan minggu ini dengan harga terbaik.
                  </p>
                </div>
                <Link to="/listings" className="inline-flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors px-6 py-3 bg-primary/10 rounded-xl">
                  View All Drops
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                {featuredAccounts.map(account => (
                  <GameAccountCard key={account.id} account={account} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features / Why Us */}
        <section className="py-24 bg-card border-t border-border mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Why trust ALEBABA STORE?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((feature, index) => (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <feature.icon className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;