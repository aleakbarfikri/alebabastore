import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReviewInput } from './review-utils.js';

test('menormalkan testimoni customer yang valid', () => {
  assert.deepEqual(normalizeReviewInput({
    rating: '5',
    comment: '  Proses cepat dan akun sesuai deskripsi.  ',
    customerName: '  Akbar  ',
  }), {
    rating: 5,
    comment: 'Proses cepat dan akun sesuai deskripsi.',
    customerName: 'Akbar',
  });
});

test('menggunakan nama Customer jika nama tampilan kosong', () => {
  assert.equal(normalizeReviewInput({ rating: 4, comment: 'Pelayanannya sangat membantu.', customerName: '' }).customerName, 'Customer');
});

test('menolak rating dan testimoni yang tidak valid', () => {
  assert.throws(() => normalizeReviewInput({ rating: 0, comment: 'Komentar yang cukup panjang' }));
  assert.throws(() => normalizeReviewInput({ rating: 6, comment: 'Komentar yang cukup panjang' }));
  assert.throws(() => normalizeReviewInput({ rating: 4.5, comment: 'Komentar yang cukup panjang' }));
  assert.throws(() => normalizeReviewInput({ rating: 5, comment: 'Pendek' }));
  assert.throws(() => normalizeReviewInput({ rating: 5, comment: 'Komentar yang cukup panjang', customerName: 'A' }));
});
