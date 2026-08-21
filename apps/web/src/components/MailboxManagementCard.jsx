import React, { useEffect, useState } from 'react';
import { Copy, Download, KeyRound, MailPlus, Power, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/apiClient.js';
import { toast } from 'sonner';

const statusLabel = {
  available: 'Tersedia',
  assigned: 'Terhubung akun',
  active: 'Aktif customer',
  disabled: 'Dinonaktifkan',
};

export default function MailboxManagementCard({ domain, mailboxes, onRefresh }) {
  const [count, setCount] = useState(10);
  const [codeLength, setCodeLength] = useState(6);
  const [busy, setBusy] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState([]);

  useEffect(() => {
    if (!createdCredentials.length) return undefined;
    const timer = window.setTimeout(() => setCreatedCredentials([]), 10 * 60_000);
    return () => window.clearTimeout(timer);
  }, [createdCredentials]);

  const credentialsText = (credentials = createdCredentials) => credentials
    .map((mailbox) => `${mailbox.address}\t${mailbox.password}`)
    .join('\n');

  const copyCredentials = async (credentials = createdCredentials) => {
    try {
      await navigator.clipboard.writeText(credentialsText(credentials));
      toast.success(credentials.length === 1 ? 'Email dan password disalin.' : 'Semua email dan password disalin.');
    } catch {
      toast.error('Gagal menyalin. Gunakan tombol unduh CSV.');
    }
  };

  const downloadCredentials = () => {
    const rows = createdCredentials.map((mailbox) => `"${mailbox.address}","${mailbox.password}"`);
    const blob = new Blob([`Email,Password\n${rows.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-alebabastore-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Daftar email dan password diunduh.');
  };

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api('/admin/mailboxes', {
        method: 'POST',
        body: JSON.stringify({ count: Number(count), code_length: Number(codeLength) }),
      });
      setCreatedCredentials(result.mailboxes || []);
      toast.success(`${result.mailboxes.length} email AlebabaStore berhasil dibuat.`);
      await onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleDisabled = async (mailbox) => {
    setBusy(true);
    try {
      await api(`/admin/mailboxes/${encodeURIComponent(mailbox.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: mailbox.status !== 'disabled' }),
      });
      toast.success(mailbox.status === 'disabled' ? 'Mailbox diaktifkan.' : 'Mailbox dinonaktifkan.');
      await onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const generatePassword = async (mailbox) => {
    if (mailbox.password_configured && !window.confirm(`Ganti password ${mailbox.address}? Password lama tidak dapat digunakan lagi.`)) return;
    setBusy(true);
    try {
      const credential = await api(`/admin/mailboxes/${encodeURIComponent(mailbox.id)}/generate-password`, { method: 'POST' });
      setCreatedCredentials([credential]);
      toast.success('Password baru berhasil dibuat. Simpan sekarang.');
      await onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (mailbox) => {
    if (!window.confirm(`Reset password ${mailbox.address} dan kirim ke email pribadi customer?`)) return;
    setBusy(true);
    try {
      await api(`/admin/mailboxes/${encodeURIComponent(mailbox.id)}/reset-password`, { method: 'POST' });
      toast.success('Password baru dikirim ke email pribadi customer.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-12 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">Email AlebabaStore</h2>
        <p className="mt-1 text-sm text-muted-foreground">Domain penerima: {domain || 'Belum dikonfigurasi'}</p>
      </div>
      <form onSubmit={generate} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-semibold text-foreground">
          Jumlah email
          <input type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground" />
        </label>
        <label className="text-sm font-semibold text-foreground">
          Panjang kode
          <select value={codeLength} onChange={(e) => setCodeLength(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground">
            <option value="4">4 karakter</option>
            <option value="5">5 karakter</option>
            <option value="6">6 karakter (disarankan)</option>
          </select>
        </label>
        <button disabled={busy || !domain} className="self-end inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">
          <MailPlus className="w-4 h-4" /> Buat email
        </button>
      </form>

      {createdCredentials.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-400/50 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Simpan password sekarang</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Password hanya ditampilkan untuk batch yang baru dibuat dan otomatis disembunyikan setelah 10 menit. Salin atau unduh sekarang.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copyCredentials()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Copy className="h-4 w-4" /> Salin semua
              </button>
              <button type="button" onClick={downloadCredentials} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
                <Download className="h-4 w-4" /> Unduh CSV
              </button>
              <button type="button" onClick={() => setCreatedCredentials([])} className="rounded-lg border border-border bg-background p-2 text-muted-foreground" aria-label="Tutup daftar password" title="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr><th className="p-3">Email</th><th className="p-3">Password</th><th className="p-3">Salin</th></tr>
              </thead>
              <tbody>
                {createdCredentials.map((mailbox) => (
                  <tr key={mailbox.id} className="border-t border-border">
                    <td className="p-3 font-mono text-foreground">{mailbox.address}</td>
                    <td className="p-3 font-mono text-foreground">{mailbox.password}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => copyCredentials([mailbox])} className="rounded-lg bg-primary/10 p-2 text-primary" aria-label={`Salin kredensial ${mailbox.address}`} title="Salin email dan password">
                        <Copy className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 max-h-96 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Password</th><th className="p-3">Akun</th><th className="p-3">Pesan</th><th className="p-3">Aksi</th></tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.id} className="border-t border-border">
                <td className="p-3 font-mono text-foreground">{mailbox.address}</td>
                <td className="p-3 text-muted-foreground">{statusLabel[mailbox.status]}</td>
                <td className="p-3 text-muted-foreground">{mailbox.password_configured ? 'Siap' : 'Belum dibuat'}</td>
                <td className="p-3 text-muted-foreground">{mailbox.account_code || '-'}</td>
                <td className="p-3 text-muted-foreground">{mailbox.message_count}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {(mailbox.status === 'available' || mailbox.status === 'assigned') && <button type="button" disabled={busy} onClick={() => generatePassword(mailbox)} className="rounded-lg bg-primary/10 px-3 py-2 text-primary" title={mailbox.password_configured ? 'Ganti password' : 'Buat password'}><KeyRound className="w-4 h-4" /></button>}
                    {mailbox.status === 'active' && <button type="button" disabled={busy} onClick={() => resetPassword(mailbox)} className="rounded-lg bg-primary/10 px-3 py-2 text-primary" title="Reset password"><RefreshCw className="w-4 h-4" /></button>}
                    {(mailbox.status === 'active' || mailbox.status === 'disabled') && <button type="button" disabled={busy} onClick={() => toggleDisabled(mailbox)} className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive" title="Aktif/nonaktif"><Power className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!mailboxes.length && <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Belum ada email. Buat batch pertama di atas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
