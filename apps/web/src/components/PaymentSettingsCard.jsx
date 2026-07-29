import React, { useEffect, useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

const PaymentSettingsCard = () => {
  const pakasirWebhookUrl = `${window.location.origin}/api/webhooks/pakasir`;
  const [form, setForm] = useState({
    payment_provider: 'temanqris',
    temanqris_api_key: '',
    temanqris_webhook_secret: '',
    pakasir_project_slug: '',
    pakasir_api_key: '',
    resend_api_key: '',
    email_from: '',
  });
  const [configured, setConfigured] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/admin/settings').then((data) => {
      setConfigured(data);
      setForm((prev) => ({
        ...prev,
        payment_provider: data.payment_provider || 'temanqris',
        pakasir_project_slug: data.pakasir_project_slug || '',
        email_from: data.email_from || '',
      }));
    }).catch((error) => toast.error(error.message));
  }, []);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api('/admin/settings', { method: 'PATCH', body: JSON.stringify(form) });
      setConfigured(result);
      setForm((prev) => ({
        ...prev,
        temanqris_api_key: '',
        temanqris_webhook_secret: '',
        pakasir_api_key: '',
        resend_api_key: '',
      }));
      toast.success('Pengaturan payment dan email tersimpan aman.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30';
  return (
    <section className="mb-8 bg-card border border-border rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Settings2 /></div>
        <div>
          <h2 className="text-xl font-bold">Payment & Pengiriman Email</h2>
          <p className="text-sm text-muted-foreground">Nilai rahasia dienkripsi di database dan tidak pernah ditampilkan kembali.</p>
        </div>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="md:col-span-2">
          <span className="block text-sm font-semibold mb-2">Provider pembayaran aktif</span>
          <select className={inputClass} name="payment_provider" value={form.payment_provider} onChange={change}>
            <option value="pakasir">Pakasir — otomatis penuh</option>
            <option value="temanqris">TemanQRIS — verifikasi merchant</option>
          </select>
        </label>
        {form.payment_provider === 'pakasir' ? (
          <>
            <input className={inputClass} name="pakasir_project_slug" value={form.pakasir_project_slug} onChange={change}
              placeholder="Project slug Pakasir" />
            <input className={inputClass} type="password" name="pakasir_api_key" value={form.pakasir_api_key} onChange={change}
              placeholder={configured.pakasir_api_key_configured ? 'API key Pakasir sudah tersimpan (isi untuk mengganti)' : 'API key Pakasir'} />
            <p className="md:col-span-2 text-sm text-muted-foreground">
              Atur Webhook URL proyek Pakasir ke <code>{pakasirWebhookUrl}</code>.
            </p>
          </>
        ) : (
          <>
            <input className={inputClass} type="password" name="temanqris_api_key" value={form.temanqris_api_key} onChange={change}
              placeholder={configured.temanqris_api_key_configured ? 'API key TemanQRIS sudah tersimpan (isi untuk mengganti)' : 'API key TemanQRIS'} />
            <input className={inputClass} type="password" name="temanqris_webhook_secret" value={form.temanqris_webhook_secret} onChange={change}
              placeholder={configured.temanqris_webhook_secret_configured ? 'Webhook secret sudah tersimpan (isi untuk mengganti)' : 'Webhook secret TemanQRIS'} />
          </>
        )}
        <div className="md:col-span-2 border-t border-border pt-4 mt-2">
          <h3 className="font-bold mb-1">Pengiriman email otomatis via Resend</h3>
          <p className="text-sm text-muted-foreground">Gunakan API key Resend dan alamat pengirim dari domain yang sudah terverifikasi.</p>
        </div>
        <input className={inputClass} type="password" name="resend_api_key" value={form.resend_api_key} onChange={change}
          placeholder={configured.resend_api_key_configured ? 'API key Resend sudah tersimpan (isi untuk mengganti)' : 'API key Resend, diawali re_'} />
        <input className={inputClass} name="email_from" value={form.email_from} onChange={change}
          placeholder="AlebabaStore <orders@domain-terverifikasi.com>" />
        <div className="md:col-span-2 flex justify-end">
          <button disabled={saving} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex gap-2 items-center disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default PaymentSettingsCard;
