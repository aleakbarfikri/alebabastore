import React, { useEffect, useState } from 'react';
import { BadgeCheck, Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient.js';

export default function CustomerReviewForm() {
  const [state, setState] = useState({ loading: true, eligible: false, account: null, review: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('Customer');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api('/customer/review')
      .then((data) => {
        if (!active) return;
        setState({ loading: false, ...data });
        if (data.review) {
          setRating(data.review.rating);
          setComment(data.review.comment);
          setCustomerName(data.review.customerName || 'Customer');
        }
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, loading: false }));
      });
    return () => { active = false; };
  }, []);

  if (state.loading || !state.eligible) return null;

  const submitReview = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const saved = await api('/customer/review', {
        method: 'POST',
        body: JSON.stringify({ rating, comment, customerName }),
      });
      setState((current) => ({ ...current, review: saved }));
      toast.success(state.review ? 'Testimoni berhasil diperbarui.' : 'Testimoni berhasil dikirim.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mb-8 rounded-3xl border border-primary/20 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <BadgeCheck className="h-5 w-5" /> Pembelian terverifikasi
          </div>
          <h2 className="text-2xl font-bold text-foreground">Rating & Testimoni</h2>
          <p className="mt-2 text-muted-foreground">
            Bagikan pengalamanmu setelah membeli {state.account?.title}.
          </p>
        </div>
      </div>

      <form onSubmit={submitReview} className="mt-6 space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">Rating</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Pilih rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} bintang`}
                onClick={() => setRating(value)}
                className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Star className={`h-8 w-8 ${value <= rating ? 'fill-[hsl(var(--rating-star))] text-[hsl(var(--rating-star))]' : 'text-muted-foreground/30'}`} />
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="review-name" className="mb-2 block text-sm font-semibold text-foreground">Nama yang ditampilkan</label>
          <input
            id="review-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">Email dan data pribadi tidak akan ditampilkan.</p>
        </div>

        <div>
          <label htmlFor="review-comment" className="mb-2 block text-sm font-semibold text-foreground">Testimoni</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            minLength={10}
            maxLength={2000}
            required
            rows={4}
            placeholder="Ceritakan pengalaman transaksi dan kondisi akun..."
            className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length}/2000</p>
        </div>

        <button
          type="submit"
          disabled={submitting || comment.trim().length < 10}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Menyimpan...' : state.review ? 'Perbarui testimoni' : 'Kirim testimoni'}
        </button>
      </form>
    </section>
  );
}
