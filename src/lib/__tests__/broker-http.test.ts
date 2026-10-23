import prisma from "../../lib/db";
import { generateSecureToken, hashToken, encryptSecret } from "../../lib/crypto";

async function testHttpEndpoints() {
  console.log("🌐 Testing Broker HTTP Endpoints against dev server (http://localhost:3000)...\n");

  const baseUrl = "http://localhost:3000";

  // 1. Test POST /api/broker/launch without authentication -> Expect 401 Unauthorized
  console.log("1. Testing unauthenticated POST /api/broker/launch:");
  const unauthRes = await fetch(`${baseUrl}/api/broker/launch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "any-project" }),
  });
  console.log(`   Status: ${unauthRes.status} (Expected: 401)`);
  const unauthData = await unauthRes.json();
  console.log(`   Response:`, unauthData);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated launch, got ${unauthRes.status}`);
  }
  console.log("   ✓ Protected launch endpoint properly blocks unauthenticated access.\n");

  // 2. Test OPTIONS /api/broker/session -> Expect 204 with CORS headers
  console.log("2. Testing OPTIONS /api/broker/session (CORS Preflight):");
  const optionsRes = await fetch(`${baseUrl}/api/broker/session`, {
    method: "OPTIONS",
  });
  console.log(`   Status: ${optionsRes.status} (Expected: 204)`);
  console.log(`   Access-Control-Allow-Origin: ${optionsRes.headers.get("access-control-allow-origin")}`);
  console.log(`   Access-Control-Allow-Methods: ${optionsRes.headers.get("access-control-allow-methods")}`);
  if (optionsRes.status !== 204) {
    throw new Error(`Expected 204 for OPTIONS, got ${optionsRes.status}`);
  }
  console.log("   ✓ CORS preflight works properly for extension service worker.\n");

  // 3. Test POST /api/broker/session with invalid token -> Expect 404
  console.log("3. Testing POST /api/broker/session with non-existent token:");
  const notFoundRes = await fetch(`${baseUrl}/api/broker/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantToken: "invalid_token_12345" }),
  });
  console.log(`   Status: ${notFoundRes.status} (Expected: 404)`);
  const notFoundData = await notFoundRes.json();
  console.log(`   Response:`, notFoundData);
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected 404 for invalid token, got ${notFoundRes.status}`);
  }
  console.log("   ✓ Invalid token rejected.\n");

  // 4. Test POST /api/broker/session with valid generated grant token:
  console.log("4. Testing valid claim via POST /api/broker/session:");
  const project = await prisma.project.findFirst({ where: { name: "Acme Brand Staging" } });
  const assignment = await prisma.assignment.findFirst({ where: { projectId: project!.id } });

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 1000);
  const sampleCookies = [
    { name: "wordpress_logged_in_abc", value: "val1", domain: "example.com", path: "/" },
  ];
  const encrypted = encryptSecret(JSON.stringify(sampleCookies));

  const createdGrant = await prisma.loginGrant.create({
    data: {
      tokenHash,
      assignmentId: assignment!.id,
      sessionDataEncrypted: encrypted.ciphertext,
      sessionDataIv: encrypted.iv,
      sessionDataAuthTag: encrypted.authTag,
      expiresAt,
    },
  });

  const claimRes = await fetch(`${baseUrl}/api/broker/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantToken: rawToken }),
  });
  console.log(`   Status: ${claimRes.status} (Expected: 200)`);
  const claimData = await claimRes.json();
  console.log(`   Response:`, claimData);
  if (claimRes.status !== 200 || !claimData.success || claimData.cookies.length !== 1) {
    throw new Error(`Failed to claim valid token: ${JSON.stringify(claimData)}`);
  }
  console.log("   ✓ Successfully claimed session cookies via HTTP.\n");

  // 5. Test Replaying the exact same grant token -> Expect 403 Forbidden
  console.log("5. Testing Replay Protection via POST /api/broker/session:");
  const replayRes = await fetch(`${baseUrl}/api/broker/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantToken: rawToken }),
  });
  console.log(`   Status: ${replayRes.status} (Expected: 403)`);
  const replayData = await replayRes.json();
  console.log(`   Response:`, replayData);
  if (replayRes.status !== 403 || replayData.code !== "GRANT_ALREADY_USED") {
    throw new Error(`Expected 403 GRANT_ALREADY_USED, got ${replayRes.status}`);
  }
  console.log("   ✓ Replay protection verified via live HTTP request.\n");

  // Cleanup
  await prisma.loginGrant.delete({ where: { id: createdGrant.id } });
  console.log("🎉 ALL HTTP BROKER TESTS PASSED SUCCESSFULLY!");
}

testHttpEndpoints()
  .catch((err) => {
    console.error("❌ HTTP test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
