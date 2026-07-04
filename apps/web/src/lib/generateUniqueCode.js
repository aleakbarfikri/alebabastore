export const generateUniqueCode = () => {
  try {
    console.log('[generateUniqueCode] Starting code generation...');
    let result = 'ACC-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    // Primary method using Crypto API for better randomness if available
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      console.log('[generateUniqueCode] Using crypto.getRandomValues');
      const randomValues = new Uint32Array(8);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < 8; i++) {
        result += chars[randomValues[i] % chars.length];
      }
    } else {
      // Fallback method using Math.random()
      console.log('[generateUniqueCode] Using Math.random fallback');
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Validation check
    if (!result || result.length !== 12 || !result.startsWith('ACC-')) {
      throw new Error('Generated code failed format validation');
    }

    console.log('[generateUniqueCode] Successfully generated valid code:', result);
    return result;
  } catch (error) {
    console.error('[generateUniqueCode] Error during generation:', error);
    // Emergency fallback to ensure a non-empty string is ALWAYS returned
    const fallback = 'ACC-' + Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, 'X');
    console.log('[generateUniqueCode] Using emergency fallback:', fallback);
    return fallback;
  }
};