import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import GameAccountCard from '@/components/GameAccountCard.jsx';
import { useGameAccounts } from '@/hooks/useGameAccounts.js';

const GAME_FILTERS = [
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

const GameListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, loading, fetchAllAccounts, deleteAccount } = useGameAccounts();
  const [selectedGame, setSelectedGame] = useState(searchParams.get('game') || '');

  const loadData = () => {
    fetchAllAccounts(selectedGame).catch(err => {
      console.error('Error fetching accounts:', err);
    });
  };

  useEffect(() => {
    loadData();
  }, [selectedGame]);

  const handleFilterChange = (gameName) => {
    const newGame = selectedGame === gameName ? '' : gameName;
    setSelectedGame(newGame);
    if (newGame) {
      setSearchParams({ game: newGame });
    } else {
      setSearchParams({});
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAccount(id);
      toast.success('Akun berhasil dihapus');
      loadData();
    } catch (error) {
      toast.error('Gagal menghapus akun');
    }
  };

  return (
    <>
      <Helmet>
        <title>ALEBABA STORE - Jual Beli Game Account</title>
        <meta name="description" content="ALEBABA STORE - Platform Marketplace Terbaik Untuk Mobile Legends, Free Fire, dan Clash of Clans. Jelajahi koleksi premium akun dengan harga terbaik dan kualitas terjamin." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight" style={{ textBalance: 'balance' }}>
              Browse Game Accounts
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Temukan dan miliki akun game sultan idamanmu hari ini juga. 
            </p>
          </motion.div>

          <div className="mb-16 bg-card/50 border border-border rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 text-muted-foreground font-semibold">
              <Filter className="w-5 h-5" />
              <span>Filter berdasarkan Game:</span>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {GAME_FILTERS.map((game) => (
                <button
                  key={game.name}
                  onClick={() => handleFilterChange(game.name)}
                  className={`flex items-center gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl transition-all duration-300 border ${
                    selectedGame === game.name
                      ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-lg shadow-primary/10 scale-[1.02]'
                      : 'bg-card border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-md'
                  }`}
                  aria-pressed={selectedGame === game.name}
                >
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-black p-1">
                    <img 
                      src={game.logo} 
                      alt={`${game.name} logo`} 
                      className="logo-container rounded-lg" 
                    />
                  </div>
                  <span className={`font-bold text-sm sm:text-base tracking-tight ${
                    selectedGame === game.name ? 'text-primary' : 'text-foreground'
                  }`}>
                    {game.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-3xl mt-8 overflow-visible border border-border shadow-sm relative pt-12">
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[1.5rem] bg-muted animate-pulse border-4 border-card"></div>
                  <div className="aspect-video bg-muted animate-pulse rounded-t-2xl mx-1"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-muted rounded animate-pulse w-1/2 mx-auto mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-5/6 mx-auto"></div>
                    </div>
                    <div className="h-8 bg-muted rounded animate-pulse w-1/3 mt-6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 pt-8">
              {accounts.map((account) => (
                <GameAccountCard 
                  key={account.id} 
                  account={account} 
                  onDelete={handleDelete} 
                />
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 bg-card/50 rounded-3xl border border-border border-dashed"
            >
              <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <SearchX className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Tidak ada akun ditemukan</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg leading-relaxed">
                {selectedGame
                  ? `Belum ada stok akun untuk game ${selectedGame} saat ini. Silakan cek kembali nanti.`
                  : 'Belum ada stok akun game yang tersedia saat ini.'}
              </p>
              {selectedGame && (
                <button
                  onClick={() => handleFilterChange(selectedGame)}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                  Clear Filter
                </button>
              )}
            </motion.div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default GameListingPage;