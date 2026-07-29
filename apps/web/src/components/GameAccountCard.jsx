import React from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '@/lib/apiClient.js';
import { Gamepad2, TrendingUp, Trash2, Edit, Tag, Castle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const GAME_LOGOS = {
  'Mobile Legends': 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/5e22b25973f0b9f6ea6ffa37efb50aa3.jpg',
  'Free Fire': 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/8714b76871045b9a290379fe75c6cb56.jpg',
  'Clash of Clans': 'https://horizons-cdn.hostinger.com/19135612-0719-4ed3-b395-6deff7303fb7/ed3a5fde3e59f26dfdd2e2407e101dd7.jpg'
};

const GameAccountCard = ({ account, onDelete, onEdit, onToggleSold }) => {
  const { isAdmin } = useAuth();
  
  const thumbnailUrl = account.images && account.images.length > 0
    ? imageUrl(account.images[0], true)
    : null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(account); // Pass the full account object to parent for confirmation dialog
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(account);
    }
  };

  const handleToggleSold = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSold) {
      onToggleSold(account);
    }
  };

  const copyCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (account.account_code) {
      navigator.clipboard.writeText(account.account_code);
      toast.success(`Kode ${account.account_code} disalin!`);
    }
  };

  const isSold = account.sold === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative h-full ${isSold ? 'opacity-85 grayscale-[0.2]' : ''}`}
    >
      {/* Admin Actions positioned top-left to avoid top-right SOLD badge overlay */}
      {isAdmin() && (
        <div className="absolute top-3 left-3 z-30 admin-action-group">
          <button 
            onClick={handleToggleSold}
            className={`admin-action-btn ${isSold ? 'text-emerald-500 hover:text-emerald-400' : 'hover:text-emerald-500'}`}
            title={isSold ? "Unmark as Sold" : "Mark as Sold"}
          >
            <Tag className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button 
            onClick={handleEdit}
            className="admin-action-btn hover:text-primary"
            title="Edit account"
          >
            <Edit className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button 
            onClick={handleDelete}
            className="admin-action-btn hover:text-destructive"
            title="Delete account"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SOLD Badge */}
      {isSold && (
        <div className="absolute top-4 right-4 z-30 bg-destructive text-white px-5 py-1.5 rounded-full font-black text-sm tracking-widest shadow-xl rotate-12 border-2 border-white/20">
          SOLD
        </div>
      )}

      <Link to={`/account/${account.id}`} className="block h-full">
        <div className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 h-full flex flex-col relative mt-8">
          
          {/* Overlapping Logo */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] overflow-hidden border-4 border-card shadow-xl bg-black group-hover:scale-105 group-hover:shadow-primary/30 transition-all duration-300 p-1.5">
              <img 
                src={GAME_LOGOS[account.game_name]} 
                alt={`${account.game_name} official logo`} 
                className="logo-container rounded-xl" 
              />
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden bg-muted rounded-t-3xl pt-10">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`Screenshot of ${account.game_name} account level ${account.level}`}
                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out ${isSold ? 'opacity-80' : 'group-hover:opacity-90'}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                <Gamepad2 className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
          </div>
          
          <div className="p-6 flex-1 flex flex-col relative z-10">
            
            {/* Account Code Badge */}
            {account.account_code && (
              <div className="flex justify-center mb-3">
                <div className="account-code-badge" onClick={(e) => e.preventDefault()}>
                  <span>{account.account_code}</span>
                  <button onClick={copyCode} className="account-code-copy-btn" aria-label="Copy account code">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {account.title ? (
              <>
                <h3 className="text-xl font-bold text-foreground text-center mb-1 tracking-tight line-clamp-2">
                  {account.title}
                </h3>
                <p className="text-sm font-medium text-muted-foreground text-center mb-4 tracking-tight">
                  {account.game_name}
                </p>
              </>
            ) : (
              <h3 className="text-xl font-bold text-foreground text-center mb-4 tracking-tight">
                {account.game_name}
              </h3>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-secondary/10 text-secondary px-3 py-1 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-bold">Lv {account.level}</span>
              </div>
              
              {account.game_name === 'Clash of Clans' && account.townhall_level && (
                <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-lg border border-accent/20">
                  <Castle className="w-4 h-4" />
                  <span className="text-sm font-bold">TH {account.townhall_level}</span>
                </div>
              )}

              {account.rank && (
                <div className="px-3 py-1 bg-muted text-foreground rounded-lg border border-border/50">
                  <span className="text-sm font-semibold">{account.rank}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-5 border-t border-border mt-auto">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold mb-0.5 tracking-wider uppercase">Harga Akun</p>
                <p className={`text-xl md:text-2xl font-black ${isSold ? 'text-muted-foreground line-through decoration-destructive/60 decoration-2' : 'text-foreground'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatPrice(account.price)}
                </p>
              </div>
              <div className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isSold ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                {isSold ? 'Terjual' : 'Detail'}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default GameAccountCard;
