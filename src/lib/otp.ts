import crypto from "crypto";

export interface OtpEntry {
  code: string;
  expiresAt: number; // Timestamp in ms
  attempts: number;
  extraData?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var __renoOtpRegistry: Map<string, OtpEntry> | undefined;
}

const otpRegistry: Map<string, OtpEntry> =
  globalThis.__renoOtpRegistry ?? (globalThis.__renoOtpRegistry = new Map());

function getKey(purpose: string, identifier: string): string {
  return `${purpose.trim().toUpperCase()}:${identifier.trim().toLowerCase()}`;
}

/**
 * Generates and stores a cryptographically secure 6-digit OTP
 * Default TTL: 600 seconds (10 minutes)
 */
export function generateOtp(
  purpose: string,
  identifier: string,
  ttlSeconds = 600,
  extraData?: any
): string {
  const key = getKey(purpose, identifier);
  // Generate a random 6-digit integer from 100000 to 999999
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + ttlSeconds * 1000;

  otpRegistry.set(key, {
    code,
    expiresAt,
    attempts: 0,
    extraData,
  });

  return code;
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: string;
  extraData?: any;
}

/**
 * Validates a 6-digit OTP code against storage
 * Enforces expiration checks and max 5 attempts limit
 */
export function verifyOtp(
  purpose: string,
  identifier: string,
  inputCode: string
): VerifyOtpResult {
  const key = getKey(purpose, identifier);
  const entry = otpRegistry.get(key);

  if (!entry) {
    return {
      valid: false,
      error: "No active verification code found or code has expired. Please request a new code.",
    };
  }

  // Expiration check
  if (Date.now() > entry.expiresAt) {
    otpRegistry.delete(key);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  // Attempt limit check (anti-brute force)
  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpRegistry.delete(key);
    return {
      valid: false,
      error: "Too many failed attempts. For your security, this verification code has been invalidated. Please request a new code.",
    };
  }

  // Timing-safe code comparison
  const expectedBuffer = Buffer.from(entry.code.trim());
  const inputBuffer = Buffer.from(inputCode.trim());

  if (
    expectedBuffer.length !== inputBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, inputBuffer)
  ) {
    const remaining = 5 - entry.attempts;
    return {
      valid: false,
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : "Code invalidated."}`,
    };
  }

  // Code is valid - clean up single-use entry
  const extraData = entry.extraData;
  otpRegistry.delete(key);

  return {
    valid: true,
    extraData,
  };
}

/**
 * Clears an existing OTP
 */
export function clearOtp(purpose: string, identifier: string): void {
  const key = getKey(purpose, identifier);
  otpRegistry.delete(key);
}
