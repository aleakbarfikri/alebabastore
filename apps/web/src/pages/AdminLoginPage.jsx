import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from '@/lib/router.jsx';
import { motion } from 'framer-motion';
import { Shield, LogIn, AlertCircle, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, verifyTwoFactor } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    code: '',
  });
  const [twoFactor, setTwoFactor] = useState(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
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
    
    if (!twoFactor && (!formData.username || !formData.password)) {
      setError('Masukkan username dan password.');
      return;
    }
    const normalizedCode = formData.code.replace(/[^A-Za-z0-9]/g, '');
    if (twoFactor && (
      useRecoveryCode ? normalizedCode.length !== 12 : !/^\d{6}$/.test(normalizedCode)
    )) {
      setError(useRecoveryCode ? 'Masukkan recovery code yang valid.' : 'Masukkan kode autentikasi 6 digit.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authData = twoFactor
        ? await verifyTwoFactor(formData.code)
        : await login(formData.username, formData.password);

      if (authData.requires_two_factor) {
        setTwoFactor(authData);
        setFormData((current) => ({ ...current, password: '', code: '' }));
        return;
      }
      if (authData.user?.role === 'customer') {
        toast.success('Login berhasil.');
        navigate('/inbox');
        return;
      }
      if (authData.recovery_codes?.length) {
        setRecoveryCodes(authData.recovery_codes);
        toast.success('2FA aktif. Simpan recovery code Anda.');
        return;
      }

      toast.success('Admin login successful');
      navigate('/admin');
    } catch (err) {
      console.error('[AdminLoginPage] Login error:', err);
      setError(twoFactor ? 'Kode autentikasi tidak valid.' : 'Username atau password tidak valid.');
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - ALEBABA STORE</title>
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
              {formData.username.includes('@') ? <Mail className="w-8 h-8 text-primary" /> : <Shield className="w-8 h-8 text-primary" />}
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Login AlebabaStore</h1>
            <p className="text-muted-foreground">
              {twoFactor ? 'Masukkan kode dari aplikasi Authenticator.' : 'Customer memakai email AlebabaStore. Admin memakai username.'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {recoveryCodes.length > 0 ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-bold text-foreground text-lg mb-2">Simpan recovery code</h2>
                  <p className="text-sm text-muted-foreground">
                    Setiap kode hanya dapat dipakai sekali jika aplikasi Authenticator tidak tersedia.
                    Kode ini tidak akan ditampilkan lagi.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-background border border-border p-4">
                  {recoveryCodes.map((code) => (
                    <code key={code} className="text-center text-sm text-foreground">{code}</code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold"
                >
                  Saya sudah menyimpan
                </button>
              </div>
            ) : <form onSubmit={handleSubmit} className="space-y-5">
              {!twoFactor && <div>
                <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-2">
                  Email AlebabaStore atau username admin
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="username"
                  placeholder="contoh: k7m2qx@mail.domain.com"
                />
              </div>}

              {!twoFactor && <div>
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
              </div>}

              {twoFactor?.setup_required && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-foreground mb-2">Aktifkan autentikasi 2 faktor</p>
                  <p className="text-muted-foreground mb-3">
                    Tambahkan akun baru secara manual di Google Authenticator, Microsoft Authenticator,
                    atau aplikasi TOTP lain menggunakan kunci berikut.
                  </p>
                  <code className="block break-all rounded-lg bg-background border border-border p-3 text-foreground font-mono tracking-wider">
                    {twoFactor.setup_secret}
                  </code>
                </div>
              )}

              {twoFactor && <div>
                <label htmlFor="code" className="block text-sm font-semibold text-foreground mb-2">
                  {useRecoveryCode ? 'Recovery code' : 'Kode autentikasi 6 digit'}
                </label>
                <input
                  type="text"
                  inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  pattern={useRecoveryCode ? undefined : '[0-9]{6}'}
                  maxLength={useRecoveryCode ? 14 : 6}
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  autoFocus
                  disabled={loading}
                  autoComplete="one-time-code"
                  className={`w-full px-4 py-3.5 bg-background border border-border rounded-xl text-center text-foreground text-2xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 ${useRecoveryCode ? 'tracking-wider' : 'tracking-[0.5em]'}`}
                  placeholder={useRecoveryCode ? 'XXXX-XXXX-XXXX' : '000000'}
                />
                {!twoFactor.setup_required && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode((current) => !current);
                      setFormData((current) => ({ ...current, code: '' }));
                      setError(null);
                    }}
                    className="mt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    {useRecoveryCode ? 'Gunakan aplikasi Authenticator' : 'Gunakan recovery code'}
                  </button>
                )}
              </div>}

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
                    {twoFactor ? <KeyRound className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {twoFactor ? (twoFactor.setup_required ? 'Aktifkan 2FA & Masuk' : 'Verifikasi & Masuk') : 'Login'}
                  </>
                )}
              </button>
            </form>}
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-8">
            Jangan berikan password atau kode OTP kepada siapa pun.
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLoginPage;
