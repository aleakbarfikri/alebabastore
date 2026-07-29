import React, { useEffect, useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

const PaymentSettingsCard = () => {
  const [form, setForm] = useState({
    temanqris_api_key: '',
    temanqris_webhook_secret: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
  });
  const [configured, setConfigured] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/admin/settings').then((data) => {
      setConfigured(data);
      setForm((prev) => ({
        ...prev,
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || 587,
        smtp_secure: Boolean(data.smtp_secure),
        smtp_from: data.smtp_from || '',
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
        smtp_user: '',
        smtp_password: '',
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
        <input className={inputClass} type="password" name="temanqris_api_key" value={form.temanqris_api_key} onChange={change}
          placeholder={configured.temanqris_api_key_configured ? 'API key TemanQRIS sudah tersimpan (isi untuk mengganti)' : 'API key TemanQRIS'} />
        <input className={inputClass} type="password" name="temanqris_webhook_secret" value={form.temanqris_webhook_secret} onChange={change}
          placeholder={configured.temanqris_webhook_secret_configured ? 'Webhook secret sudah tersimpan (isi untuk mengganti)' : 'Webhook secret TemanQRIS'} />
        <input className={inputClass} name="smtp_host" value={form.smtp_host} onChange={change} placeholder="SMTP host, contoh smtp.gmail.com" />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputClass} type="number" name="smtp_port" value={form.smtp_port} onChange={change} placeholder="Port" />
          <label className="flex items-center gap-2 px-4 border border-border rounded-xl">
            <input type="checkbox" name="smtp_secure" checked={form.smtp_secure} onChange={change} /> SSL langsung
          </label>
        </div>
        <input className={inputClass} name="smtp_user" value={form.smtp_user} onChange={change}
          placeholder={configured.smtp_user_configured ? 'SMTP user sudah tersimpan (isi untuk mengganti)' : 'SMTP username'} />
        <input className={inputClass} type="password" name="smtp_password" value={form.smtp_password} onChange={change}
          placeholder={configured.smtp_password_configured ? 'SMTP password sudah tersimpan (isi untuk mengganti)' : 'SMTP password / app password'} />
        <input className={`${inputClass} md:col-span-2`} type="email" name="smtp_from" value={form.smtp_from} onChange={change} placeholder="Email pengirim, contoh toko@domain.com" />
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
