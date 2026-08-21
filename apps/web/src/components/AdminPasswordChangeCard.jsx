import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

const AdminPasswordChangeCard = () => {
  const { adminLogout } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Semua field password wajib diisi.');
      return;
    }

    if (newPassword.length < 10) {
      toast.error('Password baru minimal 10 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak sama.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      toast.success('Password admin berhasil diubah. Silakan login ulang.');

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setTimeout(() => {
        adminLogout();
        window.location.href = '/login';
      }, 900);
    } catch (error) {
      console.error('[AdminPasswordChangeCard] Failed to change password:', error);
      toast.error('Password lama salah atau gagal mengubah password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Ubah Password Admin</h2>
            <p className="text-sm text-muted-foreground">
              Ganti password login admin untuk menjaga keamanan dashboard.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Password Lama
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordInputChange}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Masukkan password lama"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Password Baru
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordInputChange}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Minimal 10 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordInputChange}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ulangi password baru"
            />
          </div>

          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isChangingPassword ? 'Mengubah Password...' : 'Simpan Password Baru'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default AdminPasswordChangeCard;
