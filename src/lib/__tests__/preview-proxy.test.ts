import assert from "assert";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/preview-proxy/route";

async function runTests() {
  console.log("🛡️ Running Preview Unframe Proxy Unit Tests...\n");

  // Test 1: Reject request without url parameter
  console.log("1. Testing missing 'url' parameter");
  const reqNoUrl = new NextRequest("http://localhost:3000/api/preview-proxy");
  const resNoUrl = await GET(reqNoUrl);
  assert.strictEqual(resNoUrl.status, 400, "Should return 400 Bad Request");
  const jsonNoUrl = await resNoUrl.json();
  assert.strictEqual(jsonNoUrl.code, "INVALID_URL");
  console.log("   ✔ Missing URL correctly rejected with 400");

  // Test 2: Reject invalid URL protocol
  console.log("2. Testing invalid protocol rejection");
  const reqInvalidProto = new NextRequest("http://localhost:3000/api/preview-proxy?url=ftp://example.com");
  const resInvalidProto = await GET(reqInvalidProto);
  assert.strictEqual(resInvalidProto.status, 400, "Should reject ftp protocol with 400");
  console.log("   ✔ Non-HTTP/HTTPS protocol rejected");

  // Test 3: Unframe target site (https://www.whitehouse.gov/)
  console.log("3. Testing live unframing of https://www.whitehouse.gov/");
  const reqWhiteHouse = new NextRequest("http://localhost:3000/api/preview-proxy?url=https%3A%2F%2Fwww.whitehouse.gov%2F");
  const resWhiteHouse = await GET(reqWhiteHouse);
  assert.strictEqual(resWhiteHouse.status, 200, "Should successfully fetch whitehouse.gov");
  
  // Verify headers
  const xFrameOptions = resWhiteHouse.headers.get("x-frame-options");
  assert.strictEqual(xFrameOptions, "SAMEORIGIN", "X-Frame-Options should allow SAMEORIGIN framing");
  const csp = resWhiteHouse.headers.get("content-security-policy");
  assert.strictEqual(csp, null, "CSP frame-ancestors should be stripped");

  // Verify HTML modifications
  const html = await resWhiteHouse.text();
  assert.ok(html.includes('<base href="https://www.whitehouse.gov/'), "HTML must include injected <base href> tag");
  assert.ok(html.includes('id="reno-unframe-sentinel"'), "HTML must include injected unframe sentinel script");
  assert.ok(html.includes("The White House"), "HTML should contain whitehouse.gov page content");
  console.log("   ✔ Live unframing succeeded: X-Frame-Options overridden, <base> injected, sentinel active");

  console.log("\n🎉 ALL PREVIEW UNFRAME PROXY TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
