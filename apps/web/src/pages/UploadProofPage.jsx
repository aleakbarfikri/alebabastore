import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UploadZone from '@/components/UploadZone';
import { useGameAccounts } from '@/hooks/useGameAccounts';
import { useBuyerInquiries } from '@/hooks/useBuyerInquiries';
import { toast } from 'sonner';

const UploadProofPage = () => {
  const navigate = useNavigate();
  const { accounts, fetchAllAccounts } = useGameAccounts();
  const { submitInquiry, loading } = useBuyerInquiries();

  const [formData, setFormData] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    game_account_id: ''
  });
  const [paymentProof, setPaymentProof] = useState([]);
  const [additionalDocs, setAdditionalDocs] = useState([]);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.buyer_name || !formData.buyer_email || !formData.buyer_phone || !formData.game_account_id) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      await submitInquiry({
        ...formData,
        payment_proof: paymentProof,
        additional_documents: additionalDocs
      });

      toast.success('Bukti pembayaran berhasil dikirim');
      
      setFormData({
        buyer_name: '',
        buyer_email: '',
        buyer_phone: '',
        game_account_id: ''
      });
      setPaymentProof([]);
      setAdditionalDocs([]);

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      toast.error('Gagal mengirim bukti pembayaran');
    }
  };

  return (
    <>
      <Helmet>
        <title>ALEBABA STORE - Jual Beli Game Account</title>
        <meta name="description" content="Upload bukti pembayaran untuk pembelian akun game Anda di ALEBABA STORE. Proses verifikasi cepat dan aman." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" style={{ letterSpacing: '-0.02em', textBalance: 'balance' }}>
              Upload bukti pembayaran
            </h1>
            <p className="text-lg text-muted-foreground">
              Kirimkan bukti pembayaran Anda untuk verifikasi pembelian akun game
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="buyer_name" className="block text-sm font-semibold text-foreground mb-2">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  id="buyer_name"
                  name="buyer_name"
                  value={formData.buyer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Masukkan nama lengkap Anda"
                />
              </div>

              <div>
                <label htmlFor="buyer_email" className="block text-sm font-semibold text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="buyer_email"
                  name="buyer_email"
                  value={formData.buyer_email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label htmlFor="buyer_phone" className="block text-sm font-semibold text-foreground mb-2">
                  Nomor WhatsApp *
                </label>
                <input
                  type="tel"
                  id="buyer_phone"
                  name="buyer_phone"
                  value={formData.buyer_phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="08123456789"
                />
              </div>

              <div>
                <label htmlFor="game_account_id" className="block text-sm font-semibold text-foreground mb-2">
                  Pilih Akun Game *
                </label>
                <select
                  id="game_account_id"
                  name="game_account_id"
                  value={formData.game_account_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="">Pilih akun game</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.game_name} - Level {account.level} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(account.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Bukti Pembayaran
                </label>
                <UploadZone
                  onFilesChange={setPaymentProof}
                  maxFiles={5}
                  accept="image/*"
                  label="Upload bukti transfer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Dokumen Tambahan (Opsional)
                </label>
                <UploadZone
                  onFilesChange={setAdditionalDocs}
                  maxFiles={10}
                  label="Upload dokumen pendukung"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all gaming-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Kirim Bukti Pembayaran
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default UploadProofPage;