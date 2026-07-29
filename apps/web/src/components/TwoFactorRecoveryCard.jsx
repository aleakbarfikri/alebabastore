import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/apiClient.js';
import { toast } from 'sonner';

const TwoFactorRecoveryCard = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const regenerate = async (event) => {
    event.preventDefault();
    if (!currentPassword || !/^\d{6}$/.test(totpCode)) {
      toast.error('Isi password saat ini dan kode Authenticator 6 digit.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/auth/recovery-codes', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, totp_code: totpCode }),
      });
      setCodes(result.recovery_codes);
      setCurrentPassword('');
      setTotpCode('');
      toast.success('Recovery code baru dibuat. Kode lama sudah tidak berlaku.');
    } catch (error) {
      toast.error(error.message || 'Gagal membuat recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="rounded-xl bg-primary/10 p-3"><KeyRound className="w-6 h-6 text-primary" /></div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Recovery Code 2FA</h2>
          <p className="text-sm text-muted-foreground">
            Buat ulang kode darurat. Kode lama langsung dinonaktifkan dan kode baru hanya tampil sekali.
          </p>
        </div>
      </div>
      {codes.length > 0 ? (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            {codes.map((code) => <code key={code} className="text-center text-foreground">{code}</code>)}
          </div>
          <button type="button" onClick={() => setCodes([])} className="mt-4 text-sm font-semibold text-primary">
            Saya sudah menyimpan
          </button>
        </div>
      ) : (
        <form onSubmit={regenerate} className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Password admin saat ini"
            autoComplete="current-password"
            className="px-4 py-3 bg-background border border-border rounded-xl text-foreground"
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value)}
            placeholder="Kode Authenticator"
            autoComplete="one-time-code"
            className="px-4 py-3 bg-background border border-border rounded-xl text-foreground"
          />
          <button disabled={loading} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {loading ? 'Membuat...' : 'Buat ulang'}
          </button>
        </form>
      )}
    </section>
  );
};

export default TwoFactorRecoveryCard;
