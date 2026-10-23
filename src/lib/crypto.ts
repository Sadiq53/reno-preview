import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const DEFAULT_MAX_CLOCK_SKEW_SECONDS = 300; // 5 minutes

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Retrieves the 32-byte master encryption key from environment or fallback parameter.
 */
function getMasterKey(masterKeyHex?: string): Buffer {
  const hex = masterKeyHex || process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "Missing master encryption key. Ensure ENCRYPTION_KEY is set in your environment (32-byte / 64-character hex)."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(
      `Invalid master encryption key length: expected 32 bytes (64 hex characters), got ${key.length} bytes.`
    );
  }
  return key;
}

/**
 * Encrypts a plaintext secret (such as a WordPress shared secret) using AES-256-GCM.
 */
export function encryptSecret(
  plaintext: string,
  masterKeyHex?: string
): EncryptedPayload {
  const key = getMasterKey(masterKeyHex);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted secret. Throws an error if tampered with or corrupted.
 */
export function decryptSecret(
  encrypted: EncryptedPayload,
  masterKeyHex?: string
): string {
  const key = getMasterKey(masterKeyHex);
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generates a high-entropy 256-bit (32 bytes) hex string for client site shared secrets.
 */
export function generateSharedSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a cryptographically random, URL-safe Base64URL string for share links & tokens.
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/**
 * Produces a SHA-256 hash of a string (used to hash single-use login tokens at rest).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Canonicalizes the request envelope: `${timestamp}.${nonce}.${bodyString}`.
 */
export function canonicalizePayload(
  timestamp: number,
  nonce: string,
  body: Record<string, any> | string
): string {
  const bodyString = typeof body === "string" ? body : JSON.stringify(body);
  return `${timestamp}.${nonce}.${bodyString}`;
}

/**
 * Computes an HMAC-SHA256 signature for remote WordPress broker requests.
 */
export function signHmacSha256(
  secret: string,
  timestamp: number,
  nonce: string,
  body: Record<string, any> | string
): string {
  const canonical = canonicalizePayload(timestamp, nonce, body);
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

/**
 * Validates an HMAC-SHA256 signature with constant-time equality check and clock skew verification.
 */
export function verifyHmacSha256(
  signature: string,
  secret: string,
  timestamp: number,
  nonce: string,
  body: Record<string, any> | string,
  maxSkewSeconds: number = DEFAULT_MAX_CLOCK_SKEW_SECONDS
): { valid: boolean; reason?: string } {
  // 1. Clock skew check
  const now = Math.floor(Date.now() / 1000);
  const skew = Math.abs(now - timestamp);
  if (skew > maxSkewSeconds) {
    return {
      valid: false,
      reason: `Clock skew exceeded: request timestamp differs by ${skew}s (max allowed: ${maxSkewSeconds}s)`,
    };
  }

  // 2. Compute expected HMAC
  const expectedSignature = signHmacSha256(secret, timestamp, nonce, body);

  // 3. Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: "Signature length mismatch" };
  }

  const isMatch = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!isMatch) {
    return { valid: false, reason: "Invalid HMAC signature digest" };
  }

  return { valid: true };
}

/**
 * Packages optional secret and custom WordPress login URL into an encrypted vault payload.
 */
export function packVaultSecret(secret?: string | null, customLoginUrl?: string | null): string {
  return JSON.stringify({
    secret: secret && secret.trim() ? secret.trim() : null,
    wpLoginUrl: customLoginUrl && customLoginUrl.trim() ? customLoginUrl.trim() : null,
  });
}

/**
 * Unpacks vaulted secret payload into structured secret and custom login URL.
 */
export function unpackVaultSecret(rawDecrypted: string): { secret: string | null; wpLoginUrl: string | null } {
  if (!rawDecrypted) return { secret: null, wpLoginUrl: null };
  try {
    const parsed = JSON.parse(rawDecrypted);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        secret: parsed.secret || null,
        wpLoginUrl: parsed.wpLoginUrl || null,
      };
    }
  } catch {
    // Legacy plain string secret format
  }
  return { secret: rawDecrypted, wpLoginUrl: null };
}
