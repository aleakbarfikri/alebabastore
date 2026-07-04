import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

const ReviewForm = ({ gameAccountId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await pb.collection('reviews').create({
        gameAccountId,
        rating,
        comment: comment.trim(),
        customerName: customerName.trim() || 'Anonymous'
      }, { $autoCancel: false });
      
      toast.success('Review submitted successfully!');
      
      // Reset form
      setRating(0);
      setHoverRating(0);
      setComment('');
      setCustomerName('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
      <h3 className="text-xl font-bold text-foreground mb-6">Write a Review</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-semibold text-foreground mb-3">
          Overall Rating <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Rate ${star} stars`}
            >
              <Star 
                className={`w-8 h-8 transition-colors ${
                  star <= (hoverRating || rating) 
                    ? 'text-[hsl(var(--rating-star))] fill-[hsl(var(--rating-star))]' 
                    : 'text-[hsl(var(--rating-star-empty))]'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="md:col-span-2">
          <label htmlFor="comment" className="block text-sm font-semibold text-foreground mb-2">
            Your Review <span className="text-destructive">*</span>
          </label>
          <textarea
            id="comment"
            rows="4"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was your experience with this account?"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
          ></textarea>
        </div>

        <div className="md:col-span-1">
          <label htmlFor="customerName" className="block text-sm font-semibold text-foreground mb-2">
            Name (Optional)
          </label>
          <input
            type="text"
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="How should we call you?"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;