import crypto from 'node:crypto';

const LOCAL_PART_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function randomMailboxLocalPart(length = 6) {
  if (!Number.isInteger(length) || length < 4 || length > 6) {
    throw new Error('Panjang kode email harus 4 sampai 6 karakter.');
  }
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += LOCAL_PART_ALPHABET[crypto.randomInt(LOCAL_PART_ALPHABET.length)];
  }
  return value;
}

export function generateCustomerPassword() {
  return crypto.randomBytes(18).toString('base64url');
}
