export function normalizeReviewInput(body = {}) {
  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();
  const customerName = String(body.customerName || 'Customer').trim() || 'Customer';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error('Rating harus berupa angka 1 sampai 5.');
    error.status = 400;
    throw error;
  }
  if (comment.length < 10 || comment.length > 2000) {
    const error = new Error('Testimoni harus berisi 10 sampai 2.000 karakter.');
    error.status = 400;
    throw error;
  }
  if (customerName.length < 2 || customerName.length > 80) {
    const error = new Error('Nama tampilan harus berisi 2 sampai 80 karakter.');
    error.status = 400;
    throw error;
  }

  return { rating, comment, customerName };
}
