import test from 'node:test';
import assert from 'node:assert/strict';
import { decrypt, encrypt, safeEqual, sha256 } from './crypto.js';

process.env.APP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('AES-GCM encrypts sensitive values and detects tampering', () => {
  const plaintext = 'password-yang-tidak-boleh-bocor';
  const encrypted = encrypt(plaintext);

  assert.ok(encrypted.startsWith('v1.'));
  assert.equal(encrypted.includes(plaintext), false);
  assert.equal(decrypt(encrypted), plaintext);

  const parts = encrypted.split('.');
  parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => decrypt(parts.join('.')));
});

test('hashing and constant-time comparison helpers behave correctly', () => {
  assert.equal(sha256('same'), sha256('same'));
  assert.notEqual(sha256('same'), sha256('different'));
  assert.equal(safeEqual('token', 'token'), true);
  assert.equal(safeEqual('token', 'other'), false);
});
