import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCustomerPassword, randomMailboxLocalPart } from './mailbox-utils.js';

test('membuat kode mailbox acak sepanjang 4 sampai 6 karakter', () => {
  for (const length of [4, 5, 6]) {
    const values = Array.from({ length: 100 }, () => randomMailboxLocalPart(length));
    for (const value of values) assert.match(value, new RegExp(`^[a-z0-9]{${length}}$`));
  }
});

test('menolak panjang kode mailbox di luar batas', () => {
  assert.throws(() => randomMailboxLocalPart(3));
  assert.throws(() => randomMailboxLocalPart(7));
});

test('membuat password customer yang kuat dan URL-safe', () => {
  const passwords = Array.from({ length: 100 }, generateCustomerPassword);
  for (const password of passwords) assert.match(password, /^[A-Za-z0-9_-]{24}$/);
});
