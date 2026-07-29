import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, MailCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { api } from '@/lib/apiClient';

const PaymentStatusPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await api(`/orders/${encodeURIComponent(orderId)}/status`);
        if (active) setOrder(data);
      } catch (err) {
        if (active) setError(err.message);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [orderId]);

  const paid = order?.status === 'paid';
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-20">
        <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-sm">
          {paid ? <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-5" /> :
            <Clock3 className="w-16 h-16 text-primary mx-auto mb-5 animate-pulse" />}
          <h1 className="text-3xl font-bold mb-3">{paid ? 'Pembayaran dikonfirmasi' : 'Menunggu konfirmasi'}</h1>
          <p className="text-muted-foreground mb-6">
            {paid
              ? 'Detail akun sedang atau sudah dikirim ke email yang Anda masukkan.'
              : 'Status akan diperbarui otomatis. Jangan tutup email Anda dan pastikan alamatnya benar.'}
          </p>
          {paid && <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6"><MailCheck /> Cek inbox dan folder spam</div>}
          {error && <p className="text-destructive mb-4">{error}</p>}
          <p className="text-xs text-muted-foreground mb-6">Order: {orderId || '-'}</p>
          <Link to="/" className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">Kembali ke beranda</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentStatusPage;
