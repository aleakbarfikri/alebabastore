import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Inbox, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import CustomerReviewForm from '@/components/CustomerReviewForm.jsx';
import { api } from '@/lib/apiClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function CustomerInboxPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api('/customer/inbox');
      setMessages(data.messages || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    const timer = setInterval(() => loadMessages({ quiet: true }), 15_000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Inbox Email & OTP - ALEBABA STORE</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                <ShieldCheck className="w-5 h-5" /> Inbox aman dan hanya-baca
              </div>
              <h1 className="text-3xl font-bold text-foreground">Inbox Email & OTP</h1>
              <p className="mt-2 text-muted-foreground">{currentUser?.email}</p>
              {currentUser?.account_code && (
                <p className="text-sm text-muted-foreground">Akun: {currentUser.account_title} ({currentUser.account_code})</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => loadMessages()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Perbarui
            </button>
          </div>
          <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            Pesan tidak dapat diubah atau dihapus dan akan terhapus otomatis 60 hari setelah diterima.
          </p>
        </div>

        {error && <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>}

        <CustomerReviewForm />

        {loading && !messages.length ? (
          <div className="py-20 text-center text-muted-foreground">Memuat email masuk...</div>
        ) : messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 py-20 text-center">
            <Inbox className="w-14 h-14 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-bold text-foreground">Belum ada email masuk</h2>
            <p className="mt-2 text-muted-foreground">Semua email baru, termasuk kode OTP, akan muncul otomatis di halaman ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex gap-4">
                  <div className="hidden sm:flex w-11 h-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-bold text-foreground">{message.subject}</h2>
                    <p className="mt-1 break-all text-sm text-muted-foreground">Dari: {message.sender}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.received_at))}
                    </p>
                    <pre className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 font-sans text-sm leading-relaxed text-foreground">{message.body}</pre>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
