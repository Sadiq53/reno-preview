import assert from "assert";
import crypto from "crypto";
import {
  encryptSecret,
  decryptSecret,
  generateSharedSecret,
  generateSecureToken,
  hashToken,
  signHmacSha256,
  verifyHmacSha256,
} from "../crypto";

async function runTests() {
  console.log("🔒 Running Cryptographic Service Unit Tests...\n");

  const testMasterKey = crypto.randomBytes(32).toString("hex");

  // --- Test 1: AES-256-GCM Round-trip ---
  console.log("1. Testing AES-256-GCM Secret Encryption & Decryption");
  const secretPlaintext = "wp_secret_abc123_xyz789_!@#$%^&*()_+";
  const encrypted = encryptSecret(secretPlaintext, testMasterKey);

  assert.ok(encrypted.ciphertext, "Ciphertext must not be empty");
  assert.ok(encrypted.iv, "IV must not be empty");
  assert.strictEqual(encrypted.iv.length, 24, "12-byte IV in hex must be 24 characters");
  assert.strictEqual(encrypted.authTag.length, 32, "16-byte AuthTag in hex must be 32 characters");

  const decrypted = decryptSecret(encrypted, testMasterKey);
  assert.strictEqual(decrypted, secretPlaintext, "Decrypted text must match original plaintext");
  console.log("   ✔ AES-256-GCM round-trip passed");

  // --- Test 2: Tamper Detection (Authentication Tag) ---
  console.log("2. Testing Tamper Resistance (AEAD Tag Verification)");
  const tamperedCiphertext = {
    ...encrypted,
    ciphertext: encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.slice(-2) === "aa" ? "bb" : "aa"),
  };
  assert.throws(
    () => decryptSecret(tamperedCiphertext, testMasterKey),
    /Unsupported state or unable to authenticate data/,
    "Tampered ciphertext must fail authentication and throw"
  );

  const tamperedAuthTag = {
    ...encrypted,
    authTag: "00000000000000000000000000000000",
  };
  assert.throws(
    () => decryptSecret(tamperedAuthTag, testMasterKey),
    /Unsupported state or unable to authenticate data/,
    "Forged authentication tag must fail authentication and throw"
  );
  console.log("   ✔ Tamper detection passed (GCM authentication tags validated)");

  // --- Test 3: Secret Generation & Token Utilities ---
  console.log("3. Testing High-Entropy Token Generation");
  const siteSecret = generateSharedSecret();
  assert.strictEqual(siteSecret.length, 64, "256-bit secret in hex must be 64 characters");

  const secureToken = generateSecureToken(32);
  assert.ok(secureToken.length >= 40, "32-byte Base64URL token length check");
  assert.strictEqual(/^[A-Za-z0-9_-]+$/.test(secureToken), true, "Token must be URL-safe");

  const tokenHash = hashToken(secureToken);
  assert.strictEqual(tokenHash.length, 64, "SHA-256 token hash must be 64 hex characters");
  assert.strictEqual(tokenHash, hashToken(secureToken), "SHA-256 must be deterministic");
  console.log("   ✔ Token and secret utilities passed");

  // --- Test 4: HMAC-SHA256 Signing & Verification ---
  console.log("4. Testing HMAC-SHA256 Request Signing & Constant-Time Verification");
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const body = {
    user_email: "developer@agency.internal",
    role: "restricted_admin",
    expires_in: 3600,
  };

  const signature = signHmacSha256(siteSecret, now, nonce, body);
  assert.strictEqual(signature.length, 64, "HMAC-SHA256 signature must be 64 hex characters");

  const validResult = verifyHmacSha256(signature, siteSecret, now, nonce, body);
  assert.strictEqual(validResult.valid, true, "Valid HMAC must pass verification");

  // --- Test 5: Tampered Body Rejection ---
  const tamperedBody = { ...body, role: "super_admin" };
  const tamperedResult = verifyHmacSha256(signature, siteSecret, now, nonce, tamperedBody);
  assert.strictEqual(tamperedResult.valid, false, "Tampered body must be rejected");
  console.log("   ✔ HMAC-SHA256 signature verification and payload integrity passed");

  // --- Test 6: Clock Skew Enforcement (300s window) ---
  console.log("5. Testing Clock Skew Replay Defense");
  const oldTimestamp = now - 350; // 350 seconds ago (> 300s limit)
  const oldSignature = signHmacSha256(siteSecret, oldTimestamp, nonce, body);
  const expiredResult = verifyHmacSha256(oldSignature, siteSecret, oldTimestamp, nonce, body);
  assert.strictEqual(expiredResult.valid, false, "Expired timestamp (>300s) must be rejected");
  assert.ok(expiredResult.reason?.includes("Clock skew exceeded"), "Reason must mention clock skew");
  console.log("   ✔ Clock skew window (300s) enforced successfully");

  // --- Test 7: Secret Vault Packing & Unpacking ---
  console.log("6. Testing Secret Vault Packing & Unpacking (Multi-field Encrypted Storage)");
  const { packVaultSecret, unpackVaultSecret } = await import("@/lib/crypto");
  
  // A: Both secret & customLoginUrl
  const packedFull = packVaultSecret("my-app-password", "https://gamingpcdiscount.com/custom-login");
  const unpackedFull = unpackVaultSecret(packedFull);
  assert.strictEqual(unpackedFull.secret, "my-app-password");
  assert.strictEqual(unpackedFull.wpLoginUrl, "https://gamingpcdiscount.com/custom-login");

  // B: Only customLoginUrl (secret is null)
  const packedUrlOnly = packVaultSecret(null, "https://example.com/wp-login.php");
  const unpackedUrlOnly = unpackVaultSecret(packedUrlOnly);
  assert.strictEqual(unpackedUrlOnly.secret, null);
  assert.strictEqual(unpackedUrlOnly.wpLoginUrl, "https://example.com/wp-login.php");

  // C: Legacy raw string (backward compatibility)
  const legacySecret = "raw-legacy-secret-without-json";
  const unpackedLegacy = unpackVaultSecret(legacySecret);
  assert.strictEqual(unpackedLegacy.secret, legacySecret);
  assert.strictEqual(unpackedLegacy.wpLoginUrl, null);

  console.log("   ✔ Secret vault packing, unpacking & backward compatibility passed");

  console.log("\n🎉 ALL CRYPTOGRAPHIC TESTS PASSED WITH 100% SUCCESS!\n");
}

runTests().catch((err) => {
  console.error("❌ Cryptographic test failed:", err);
  process.exit(1);
});
