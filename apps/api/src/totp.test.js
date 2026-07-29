import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRecoveryCodes, normalizeRecoveryCode } from './recoveryCodes.js';
import { generateTotpSecret, totpUri, verifyTotp } from './totp.js';

test('memverifikasi kode TOTP RFC 6238 dan toleransi waktu satu interval', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(verifyTotp(secret, '287082', 59_000), true);
  assert.equal(verifyTotp(secret, '287082', 89_000), true);
  assert.equal(verifyTotp(secret, '000000', 59_000), false);
});

test('menghasilkan secret dan URI Authenticator yang valid', () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.match(totpUri({ secret, username: 'admin' }), /^otpauth:\/\/totp\//);
});

test('menghasilkan recovery code kuat dalam format yang mudah disimpan', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) assert.match(code, /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
  assert.equal(normalizeRecoveryCode('abcd-1234-ef90'), 'ABCD1234EF90');
});
