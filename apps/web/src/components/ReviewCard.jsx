import React, { useState } from 'react';
import { BadgeCheck, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ReviewCard = ({ review, onDelete }) => {
  const { isAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm('Hapus ulasan ini?')) {
      setIsDeleting(true);
      await onDelete(review.id);
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(review.created).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const reviewerName = review.customerName || 'Customer';
  const initial = reviewerName.charAt(0).toUpperCase();

  // Consistent background color based on name
  const bgColors = ['bg-primary/20 text-primary', 'bg-secondary/20 text-secondary', 'bg-accent/20 text-accent'];
  const colorIndex = reviewerName.length % bgColors.length;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 relative group transition-all duration-300 hover:shadow-md">
      {isAdmin() && onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Hapus ulasan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${bgColors[colorIndex]}`}>
          {initial}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{reviewerName}</h4>
            {review.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <BadgeCheck className="h-4 w-4" /> Pembelian terverifikasi
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= review.rating
                ? 'text-[hsl(var(--rating-star))] fill-[hsl(var(--rating-star))]'
                : 'text-[hsl(var(--rating-star-empty))]'
            }`}
          />
        ))}
      </div>

      <p className="text-muted-foreground leading-relaxed text-sm">
        {review.comment}
      </p>
    </div>
  );
};

export default ReviewCard;
