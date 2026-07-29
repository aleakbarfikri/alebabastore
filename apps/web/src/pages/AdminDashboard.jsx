import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Users, TrendingUp, X, ShoppingCart, Filter } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import UploadZone from '@/components/UploadZone.jsx';
import BuyerInquiryTable from '@/components/BuyerInquiryTable.jsx';
import GameAccountCard from '@/components/GameAccountCard.jsx';
import StatisticsCard from '@/components/StatisticsCard.jsx'; import AdminPasswordChangeCard from '@/components/AdminPasswordChangeCard.jsx';
import EditItemModal from '@/components/EditItemModal.jsx';
import PaymentSettingsCard from '@/components/PaymentSettingsCard.jsx';
import { useGameAccounts } from '@/hooks/useGameAccounts.js';
import { useBuyerInquiries } from '@/hooks/useBuyerInquiries.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from '@/lib/apiClient.js';
import { toast } from 'sonner';
import { generateUniqueCode } from '@/lib/generateUniqueCode.js';

const backupCodesFrom = (value) => (
  String(value || '').split(/[\n,]+/).map((code) => code.trim()).filter(Boolean)
);

const AdminDashboard = () => {
  const { getCurrentUser } = useAuth();
  const adminUser = getCurrentUser();
  const { accounts, fetchAllAccounts, createAccount, deleteAccount } = useGameAccounts();
  const { inquiries, fetchInquiries } = useBuyerInquiries();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showSoldItems, setShowSoldItems] = useState(true);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Delete Confirmation State
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    game_name: 'Mobile Legends',
    level: '',
    rank: '',
    description: '',
    price: '',
    townhall_level: '',
    credential_email: '',
    credential_password: '',
    backup_codes: ''
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const backupCodeCount = backupCodesFrom(formData.backup_codes).length;

  const loadDashboardData = () => {
    fetchAllAccounts().catch(console.error);
    fetchInquiries().catch(console.error);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'game_name' && value !== 'Clash of Clans') {
        updated.townhall_level = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const accountCode = generateUniqueCode();

    if (!accountCode || typeof accountCode !== 'string' || accountCode.trim() === '') {
      toast.error('Failed to generate account code. Please try again.');
      setSubmitting(false);
      return;
    }

    if (!formData.credential_email.trim() || !formData.credential_password || backupCodeCount !== 8) {
      toast.error(
        `Isi email akun, password, dan tepat 8 kode cadangan Gmail. Saat ini terdeteksi ${backupCodeCount} kode.`,
      );
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        game_name: formData.game_name,
        level: parseFloat(formData.level),
        rank: formData.rank || '',
        description: formData.description,
        price: parseFloat(formData.price),
        account_code: accountCode,
        credential_email: formData.credential_email,
        credential_password: formData.credential_password,
        backup_codes: formData.backup_codes,
      };
      
      if (formData.title) {
        payload.title = formData.title;
      }
      
      if (images && images.length > 0) {
        payload.images = images;
      }
      
      if (formData.game_name === 'Clash of Clans' && formData.townhall_level) {
        payload.townhall_level = parseInt(formData.townhall_level, 10);
      } else {
        payload.townhall_level = null;
      }

      await createAccount(payload);
      toast.success(`Akun game berhasil ditambahkan (Kode: ${accountCode})`);
      
      setFormData({
        title: '',
        game_name: 'Mobile Legends',
        level: '',
        rank: '',
        description: '',
        price: '',
        townhall_level: '',
        credential_email: '',
        credential_password: '',
        backup_codes: ''
      });
      setImages([]);
      setShowAddForm(false);
    } catch (error) {
      let errorMsg = 'Gagal menambahkan akun game.';
      if (error.response && error.response.data) {
        errorMsg += ` Details: ${Object.entries(error.response.data).map(([f, err]) => `${f}: ${err.message}`).join(' | ')}`;
      } else if (error.data && error.data.data) {
        errorMsg += ` Details: ${Object.entries(error.data.data).map(([f, err]) => `${f}: ${err.message}`).join(' | ')}`;
      } else if (error.message) {
        errorMsg += ` ${error.message}`;
      }
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAccount(accountToDelete.id);
      toast.success(`Berhasil menghapus akun ${accountToDelete.game_name}`);
      setAccountToDelete(null);
      loadDashboardData(); // Refresh UI state from DB
    } catch (error) {
      toast.error(`Gagal menghapus akun: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (account) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  };

  const handleToggleSold = async (account) => {
    try {
      const newSoldStatus = !account.sold;
      await api(`/accounts/${encodeURIComponent(account.id)}`, {
        method: 'PATCH',
        body: (() => {
          const data = new FormData();
          data.append('sold', String(newSoldStatus));
          return data;
        })(),
      });
      toast.success(`Account marked as ${newSoldStatus ? 'SOLD' : 'AVAILABLE'}`);
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    if (!window.confirm('Pastikan dana sudah benar-benar masuk. Konfirmasi pembayaran ini sekarang?')) return;
    try {
      await api(`/admin/orders/${encodeURIComponent(orderId)}/verify`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Pembayaran terverifikasi dan email pengiriman diproses.');
      fetchInquiries();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSyncPayment = async (orderId) => {
    try {
      const order = await api(`/admin/orders/${encodeURIComponent(orderId)}/sync`, { method: 'POST' });
      toast.success(`Status TemanQRIS: ${order.status}`);
      fetchInquiries();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResendDelivery = async (orderId) => {
    try {
      await api(`/admin/orders/${encodeURIComponent(orderId)}/resend`, { method: 'POST' });
      toast.success('Email berhasil dikirim ulang.');
      fetchInquiries();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const displayedAccounts = accounts.filter(acc => showSoldItems || !acc.sold);

  return (
    <>
      <Helmet>
        <title>ALEBABA STORE - Admin Dashboard</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-6 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome back, {adminUser?.username || 'admin'}</h1>
              <p className="text-muted-foreground mt-1">Manage your store operations here.</p>
            </div>
            <div className="hidden sm:block">
              <span className="px-3 py-1 bg-primary/10 text-primary font-semibold text-xs tracking-wider uppercase rounded-full border border-primary/20">
                Admin Privilege
              </span>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatisticsCard
              title="Active Listings"
              value={accounts.filter(a => !a.sold).length}
              icon={Package}
              colorClass="text-primary"
              bgClass="bg-primary/10"
              delay={0}
            />
            <StatisticsCard
              title="Pending Reviews"
              value={inquiries.filter(i => i.status === 'pending').length}
              icon={TrendingUp}
              colorClass="text-secondary"
              bgClass="bg-secondary/10"
              delay={0.1}
            />
            <StatisticsCard
              title="Total Inquiries"
              value={inquiries.length}
              icon={Users}
              colorClass="text-accent"
              bgClass="bg-accent/10"
              delay={0.2}
            />
            <StatisticsCard
              title="Total Sold"
              value={accounts.filter(a => a.sold).length}
              icon={ShoppingCart}
              colorClass="text-emerald-500"
              bgClass="bg-emerald-500/10"
              delay={0.3}
            />
          </div>

          <PaymentSettingsCard />
          <AdminPasswordChangeCard /> {/* Game Accounts Management */}
          <section className="mb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Game Accounts Inventory</h2>
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Show Sold</span>
                  <Switch 
                    checked={showSoldItems} 
                    onCheckedChange={setShowSoldItems} 
                  />
                </div>
              </div>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  showAddForm 
                    ? 'bg-muted text-foreground hover:bg-muted/80' 
                    : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90'
                }`}
              >
                {showAddForm ? (
                  <><X className="w-4 h-4" /> Cancel Adding</>
                ) : (
                  <><Plus className="w-4 h-4" /> Add New Account</>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="mb-8"
                >
                  <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-xl font-bold text-foreground mb-6">Create New Listing</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-xl mb-6">
                        <p className="text-sm text-secondary font-medium flex items-center gap-2">
                          <span className="flex w-2 h-2 rounded-full bg-secondary"></span>
                          A unique Account Code (ACC-XXXXXXXX) will be automatically generated upon saving.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-2">
                            Title (Optional)
                          </label>
                          <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            maxLength={255}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            placeholder="Contoh: Mobile Legend Skin 210"
                          />
                        </div>

                        <div>
                          <label htmlFor="game_name" className="block text-sm font-semibold text-foreground mb-2">
                            Game Name *
                          </label>
                          <select
                            id="game_name"
                            name="game_name"
                            value={formData.game_name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          >
                            <option value="Mobile Legends">Mobile Legends</option>
                            <option value="Free Fire">Free Fire</option>
                            <option value="Clash of Clans">Clash of Clans</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="level" className="block text-sm font-semibold text-foreground mb-2">
                            Account Level *
                          </label>
                          <input
                            type="number"
                            id="level"
                            name="level"
                            value={formData.level}
                            onChange={handleInputChange}
                            required
                            min="1"
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            placeholder="e.g. 120"
                          />
                        </div>

                        {formData.game_name === 'Clash of Clans' && (
                          <div>
                            <label htmlFor="townhall_level" className="block text-sm font-semibold text-foreground mb-2">
                              TownHall Level *
                            </label>
                            <select
                              id="townhall_level"
                              name="townhall_level"
                              value={formData.townhall_level}
                              onChange={handleInputChange}
                              required
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            >
                              <option value="" disabled>Select TH Level</option>
                              {[...Array(14)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  TH {i + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label htmlFor="rank" className="block text-sm font-semibold text-foreground mb-2">
                            Rank / Tier
                          </label>
                          <input
                            type="text"
                            id="rank"
                            name="rank"
                            value={formData.rank}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            placeholder="e.g. Mythic Glory"
                          />
                        </div>

                        <div>
                          <label htmlFor="price" className="block text-sm font-semibold text-foreground mb-2">
                            Price (IDR) *
                          </label>
                          <input
                            type="number"
                            id="price"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                            min="0"
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            placeholder="500000"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2">
                          Description Details *
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                          placeholder="Provide detailed account features, skins, heroes, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Account Screenshots
                        </label>
                        <UploadZone
                          onFilesChange={setImages}
                          maxFiles={10}
                          accept="image/*"
                          label="Upload proof screenshots"
                        />
                      </div>

                      <div className="border border-primary/20 bg-primary/5 rounded-2xl p-5">
                        <h4 className="font-bold text-foreground mb-4">Data pengiriman otomatis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="email" name="credential_email" value={formData.credential_email} onChange={handleInputChange} required
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl" placeholder="Email akun Gmail" />
                          <input type="password" name="credential_password" value={formData.credential_password} onChange={handleInputChange} required
                            className="w-full px-4 py-3 bg-background border border-border rounded-xl" placeholder="Password akun Gmail" />
                          <textarea name="backup_codes" value={formData.backup_codes} onChange={handleInputChange} required rows={5}
                            className="md:col-span-2 w-full px-4 py-3 bg-background border border-border rounded-xl resize-none"
                            placeholder={"Masukkan tepat 8 kode cadangan Gmail, satu kode per baris"} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <p className="text-muted-foreground">Data dienkripsi AES-256-GCM dan tidak pernah dikirim ke browser publik.</p>
                          <p className={backupCodeCount === 8 ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                            {backupCodeCount}/8 kode terdeteksi
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border flex justify-end">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {submitting ? 'Saving Listing...' : 'Publish Account'}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {displayedAccounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {displayedAccounts.map((account) => (
                  <GameAccountCard 
                    key={account.id} 
                    account={account} 
                    onDelete={handleDeleteClick}
                    onEdit={handleEditClick}
                    onToggleSold={handleToggleSold}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-card/50 border border-border border-dashed rounded-3xl">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No accounts to display</p>
                <p className="text-muted-foreground mb-6">
                  {accounts.length > 0 ? "All listed accounts are marked as sold. Try changing the filter." : "Start by adding your first game account."}
                </p>
                {!showAddForm && accounts.length === 0 && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-2.5 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    Create Listing
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Edit Item Modal */}
          <EditItemModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            account={editingAccount} 
            onSuccess={loadDashboardData} 
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the 
                  <strong className="text-foreground"> {accountToDelete?.game_name}</strong> account 
                  (Level {accountToDelete?.level} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(accountToDelete?.price || 0)}) from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Inquiries Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-6">Customer Inquiries</h2>
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <BuyerInquiryTable inquiries={inquiries} onVerify={handleVerifyPayment} onSync={handleSyncPayment} onResend={handleResendDelivery} />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminDashboard;
