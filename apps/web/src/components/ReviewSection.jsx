import React, { useState, useEffect } from 'react';
import { RefreshCcw, StarHalf } from 'lucide-react';
import { api } from '@/lib/apiClient.js';
import ReviewCard from './ReviewCard.jsx';
import { toast } from 'sonner';

const ReviewSection = ({ gameAccountId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'highest'

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api(`/accounts/${encodeURIComponent(gameAccountId)}/reviews?sort=${sortBy}`);
      setReviews(result);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Gagal memuat ulasan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameAccountId) {
      fetchReviews();
    }
  }, [gameAccountId, sortBy]);

  const handleDeleteReview = async (id) => {
    try {
      await api(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast.success('Ulasan berhasil dihapus');
      fetchReviews();
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error('Gagal menghapus ulasan');
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (!loading && !error && reviews.length === 0) return null;

  return (
    <div className="mt-16 pt-12 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">Ulasan Customer</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[hsl(var(--rating-star))]">
              <StarHalf className="w-5 h-5 fill-current" />
              <span className="text-xl font-bold text-foreground">{averageRating}</span>
            </div>
            <span className="text-muted-foreground">({reviews.length} ulasan)</span>
          </div>
        </div>

        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'newest' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Terbaru
          </button>
          <button
            onClick={() => setSortBy('highest')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'highest' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Rating Tertinggi
          </button>
        </div>
      </div>

      <div>
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-muted animate-pulse"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-muted rounded animate-pulse"></div>
                    <div className="h-3 w-4/5 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-card/50 border border-border rounded-2xl">
              <p className="text-destructive mb-4">{error}</p>
              <button 
                onClick={fetchReviews}
                className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Coba lagi
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 bg-card/50 border border-border border-dashed rounded-3xl">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <StarHalf className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Belum ada ulasan</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ulasan hanya dapat dikirim oleh customer setelah pembelian selesai.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onDelete={handleDeleteReview} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default ReviewSection;
