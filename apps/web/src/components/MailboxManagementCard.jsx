import React, { useState } from 'react';
import { MailPlus, Power, RefreshCw } from 'lucide-react';
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

  const generate = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api('/admin/mailboxes', {
        method: 'POST',
        body: JSON.stringify({ count: Number(count), code_length: Number(codeLength) }),
      });
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

      <div className="mt-6 max-h-96 overflow-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Akun</th><th className="p-3">Pesan</th><th className="p-3">Aksi</th></tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.id} className="border-t border-border">
                <td className="p-3 font-mono text-foreground">{mailbox.address}</td>
                <td className="p-3 text-muted-foreground">{statusLabel[mailbox.status]}</td>
                <td className="p-3 text-muted-foreground">{mailbox.account_code || '-'}</td>
                <td className="p-3 text-muted-foreground">{mailbox.message_count}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {mailbox.status === 'active' && <button type="button" disabled={busy} onClick={() => resetPassword(mailbox)} className="rounded-lg bg-primary/10 px-3 py-2 text-primary" title="Reset password"><RefreshCw className="w-4 h-4" /></button>}
                    {(mailbox.status === 'active' || mailbox.status === 'disabled') && <button type="button" disabled={busy} onClick={() => toggleDisabled(mailbox)} className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive" title="Aktif/nonaktif"><Power className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!mailboxes.length && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Belum ada email. Buat batch pertama di atas.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
