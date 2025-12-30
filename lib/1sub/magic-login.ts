/**
 * Magic Login verification for 1Sub
 * 
 * Verifies the HMAC-SHA256 signature from 1Sub magic login links.
 * Uses timing-safe comparison to prevent timing attacks.
 */

import crypto from 'crypto';

const MAX_AGE_SECONDS = 60; // Link expires after 60 seconds

export interface MagicLoginParams {
  user: string;   // oneSubUserId
  ts: string;     // Unix timestamp
  sig: string;    // HMAC-SHA256 signature
}

export interface MagicLoginResult {
  valid: boolean;
  oneSubUserId?: string;
  error?: string;
}

/**
 * Verifies a 1Sub magic login signature
 * 
 * @param params - The query parameters from the magic login URL
 * @returns Object with validation result
 */
export function verifyMagicLogin(params: MagicLoginParams): MagicLoginResult {
  const { user, ts, sig } = params;

  // 1. Validate required parameters
  if (!user || !ts || !sig) {
    return {
      valid: false,
      error: 'Missing required parameters (user, ts, sig)',
    };
  }

  // 2. Get secret from environment
  const secret = process.env.ONESUB_MAGICLOGIN_SECRET;
  if (!secret) {
    console.error('❌ ONESUB_MAGICLOGIN_SECRET not configured');
    return {
      valid: false,
      error: 'Magic login not configured',
    };
  }

  // 3. Check timestamp (60 second expiry)
  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(ts, 10);
  
  if (isNaN(timestamp)) {
    return {
      valid: false,
      error: 'Invalid timestamp',
    };
  }

  if (now - timestamp > MAX_AGE_SECONDS) {
    return {
      valid: false,
      error: 'Link expired. Please try again from 1Sub.',
    };
  }

  // 4. Verify signature using HMAC-SHA256
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${user}${ts}`)
    .digest('hex');

  // 5. Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expectedSig);

    // Buffers must be same length for timingSafeEqual
    if (sigBuffer.length !== expectedBuffer.length) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Invalid signature format',
    };
  }

  // 6. Signature valid!
  return {
    valid: true,
    oneSubUserId: user,
  };
}

