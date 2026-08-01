import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from '@/lib/router.jsx';
import { motion } from 'framer-motion';
import { CheckCircle, LockKeyhole, MailCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useGameAccounts } from '@/hooks/useGameAccounts';
import { useBuyerInquiries } from '@/hooks/useBuyerInquiries';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient.js';

const UploadProofPage = () => {
  const [searchParams] = useSearchParams();
  const { accounts, fetchAllAccounts } = useGameAccounts();
  const { submitInquiry, loading } = useBuyerInquiries();
  const availableAccounts = accounts.filter((account) => !account.sold);

  const [formData, setFormData] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    game_account_id: searchParams.get('account') || ''
  });
  const [emailVerification, setEmailVerification] = useState({
    id: '',
    code: '',
    token: '',
    loading: false,
  });
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  useEffect(() => {
    if (
      formData.game_account_id
      && accounts.length > 0
      && !availableAccounts.some((account) => account.id === formData.game_account_id)
    ) {
      setFormData((current) => ({ ...current, game_account_id: '' }));
    }
  }, [accounts, formData.game_account_id]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (e.target.name === 'buyer_email') {
      setEmailVerification({ id: '', code: '', token: '', loading: false });
      setResendCooldown(0);
    }
  };

  const sendVerificationCode = async () => {
    if (!formData.buyer_email) {
      toast.error('Masukkan email pembeli terlebih dahulu.');
      return;
    }
    setEmailVerification((current) => ({ ...current, loading: true }));
    try {
      const result = await api('/checkout/email-verification', {
        method: 'POST',
        body: JSON.stringify({ email: formData.buyer_email }),
      });
      setEmailVerification({
        id: result.verification_id,
        code: '',
        token: '',
        loading: false,
      });
      setResendCooldown(Number(result.resend_after) || 60);
      toast.success('Kode verifikasi sudah dikirim ke email.');
    } catch (error) {
      setEmailVerification((current) => ({ ...current, loading: false }));
      toast.error(error.message || 'Gagal mengirim kode verifikasi.');
    }
  };

  const confirmVerificationCode = async () => {
    if (!/^\d{6}$/.test(emailVerification.code)) {
      toast.error('Masukkan kode verifikasi 6 digit.');
      return;
    }
    setEmailVerification((current) => ({ ...current, loading: true }));
    try {
      const result = await api('/checkout/email-verification/confirm', {
        method: 'POST',
        body: JSON.stringify({
          verification_id: emailVerification.id,
          code: emailVerification.code,
        }),
      });
      setEmailVerification((current) => ({
        ...current,
        token: result.verification_token,
        loading: false,
      }));
      toast.success('Email berhasil diverifikasi.');
    } catch (error) {
      setEmailVerification((current) => ({ ...current, loading: false }));
      toast.error(error.message || 'Kode verifikasi tidak valid.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.buyer_name || !formData.buyer_email || !formData.buyer_phone || !formData.game_account_id) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      if (!emailVerification.token) {
        toast.error('Verifikasi email sebelum melanjutkan pembayaran.');
        return;
      }
      const checkout = await submitInquiry({
        ...formData,
        email_verification_token: emailVerification.token,
      });
      toast.success('Link pembayaran berhasil dibuat');
      window.location.assign(checkout.payment_url);
    } catch (error) {
      toast.error(error.message || 'Gagal membuat pembayaran');
    }
  };

  return (
    <>
      <Helmet>
        <title>Checkout Aman - ALEBABA STORE</title>
        <meta name="description" content="Checkout QRIS aman untuk pembelian akun game di ALEBABA STORE." />
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
              Checkout pembayaran
            </h1>
            <p className="text-lg text-muted-foreground">
              Isi email aktif. Detail akun akan dikirim otomatis setelah pembayaran dikonfirmasi.
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
                <div className="mt-3">
                  {emailVerification.token ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                      <MailCheck className="w-5 h-5" />
                      Email sudah terverifikasi
                    </div>
                  ) : emailVerification.id ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={emailVerification.code}
                        onChange={(event) => setEmailVerification((current) => ({
                          ...current,
                          code: event.target.value.replace(/\D/g, ''),
                        }))}
                        placeholder="Kode 6 digit dari email"
                        autoComplete="one-time-code"
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground"
                      />
                      <button
                        type="button"
                        onClick={confirmVerificationCode}
                        disabled={emailVerification.loading}
                        className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                      >
                        {emailVerification.loading ? 'Memeriksa...' : 'Verifikasi'}
                      </button>
                      <button
                        type="button"
                        onClick={sendVerificationCode}
                        disabled={emailVerification.loading || resendCooldown > 0}
                        className="px-4 py-3 text-sm font-semibold text-primary"
                      >
                        {resendCooldown > 0 ? `Kirim ulang (${resendCooldown} detik)` : 'Kirim ulang'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={emailVerification.loading}
                      className="px-5 py-3 rounded-xl border border-primary text-primary font-semibold disabled:opacity-50"
                    >
                      {emailVerification.loading ? 'Mengirim...' : 'Kirim kode verifikasi'}
                    </button>
                  )}
                </div>
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
                  <option value="">
                    {availableAccounts.length ? 'Pilih akun game' : 'Belum ada akun tersedia'}
                  </option>
                  {availableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.game_name} - Level {account.level} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(account.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <LockKeyhole className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Email wajib diverifikasi. Setelah link pembayaran dibuat, akun ditahan maksimal 30 menit.
                  Kredensial produk hanya dikirim setelah pembayaran QRIS terverifikasi otomatis.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || availableAccounts.length === 0 || !emailVerification.token}
                className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all gaming-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Membuat pembayaran...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Lanjut Bayar dengan QRIS
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
