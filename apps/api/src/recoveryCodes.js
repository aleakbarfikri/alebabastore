import crypto from 'node:crypto';
import { sha256 } from './crypto.js';

const RECOVERY_CODE_COUNT = 10;

export function normalizeRecoveryCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export function recoveryCodeHashes(codes) {
  return codes.map((code) => sha256(normalizeRecoveryCode(code)));
}
