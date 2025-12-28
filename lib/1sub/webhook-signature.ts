import { createHmac } from 'crypto';

/**
 * Verifies the HMAC-SHA256 signature of a 1Sub webhook payload
 * 
 * @param payload - The raw request body as a string
 * @param signature - The 'X-1sub' header value (format: "t=timestamp,v1=hash")
 * @param secret - Your 1SUB_WEBHOOK_SECRET
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Parse signature header: "t=1700000000,v1=abcdef123..."
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      console.error('Invalid signature format');
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const expectedSignature = signaturePart.split('=')[1];

    // Verify timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    const timeDifference = Math.abs(currentTime - signatureTime);

    if (timeDifference > 300) {
      console.error('Signature timestamp too old');
      return false;
    }

    // Compute HMAC-SHA256
    const signedPayload = `${timestamp}.${payload}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(signedPayload);
    const computedSignature = hmac.digest('hex');

    // Compare signatures (constant-time comparison)
    return timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

