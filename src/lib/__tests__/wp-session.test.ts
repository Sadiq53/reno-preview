import assert from "assert";
import {
  normalizeWpLoginUrl,
  parseCookieLine,
  extractCookiesFromHeaders,
  parseWpErrorMessage,
  authenticateWordPressSession,
} from "../wp-session";

async function runTests() {
  console.log("🚀 Running Headless WordPress Session Authenticator Tests...\n");

  // --- Test 1: URL Normalization ---
  console.log("1. Testing WordPress URL Normalization");
  const norm1 = normalizeWpLoginUrl("clientbrand.com");
  assert.strictEqual(norm1.baseUrl, "https://clientbrand.com");
  assert.strictEqual(norm1.loginUrl, "https://clientbrand.com/wp-login.php");
  assert.strictEqual(norm1.domain, "clientbrand.com");

  const norm2 = normalizeWpLoginUrl("http://staging.agency.org/blog/");
  assert.strictEqual(norm2.baseUrl, "http://staging.agency.org");
  assert.strictEqual(norm2.loginUrl, "http://staging.agency.org/blog/wp-login.php");
  assert.strictEqual(norm2.domain, "staging.agency.org");

  const norm3 = normalizeWpLoginUrl("https://shop.co/custom/wp-login.php");
  assert.strictEqual(norm3.loginUrl, "https://shop.co/custom/wp-login.php");
  console.log("   ✔ URL normalization passed (handles protocols, subdirectories, and trailing slashes)");

  // --- Test 2: Set-Cookie Parsing ---
  console.log("2. Testing Set-Cookie Attribute Parsing");
  const rawCookie =
    "wordpress_logged_in_872c91a=devuser%7C1710000000%7Cxyz; path=/; domain=.clientbrand.com; secure; HttpOnly; SameSite=Lax; Max-Age=172800";
  const parsed = parseCookieLine(rawCookie, "clientbrand.com");

  assert.ok(parsed, "Cookie must parse successfully");
  assert.strictEqual(parsed.name, "wordpress_logged_in_872c91a");
  assert.strictEqual(parsed.value, "devuser%7C1710000000%7Cxyz");
  assert.strictEqual(parsed.domain, "clientbrand.com");
  assert.strictEqual(parsed.path, "/");
  assert.strictEqual(parsed.secure, true);
  assert.strictEqual(parsed.httpOnly, true);
  assert.strictEqual(parsed.sameSite, "Lax");
  assert.ok(parsed.expires && parsed.expires > Math.floor(Date.now() / 1000), "Expires must be in future");
  console.log("   ✔ Set-Cookie parser successfully extracted name, value, path, domain, secure, httpOnly, and expires");

  // --- Test 3: WordPress Error Extraction ---
  console.log("3. Testing WordPress Login Error Extraction");
  const htmlWithError = `
    <!DOCTYPE html>
    <html>
      <body>
        <div id="login_error">	<strong>Error:</strong> The password you entered for the username <strong>admin</strong> is incorrect. <a href="#">Lost your password?</a><br />
        </div>
      </body>
    </html>
  `;
  const errorMsg = parseWpErrorMessage(htmlWithError);
  assert.ok(errorMsg.includes("password you entered for the username admin is incorrect"));
  assert.ok(!errorMsg.includes("<strong>"), "HTML tags must be stripped");
  console.log("   ✔ HTML login error parsed and sanitized cleanly");

  // --- Test 4: Mock Headless Login - Success Scenario ---
  console.log("4. Testing Headless Authentication - Successful Login Handshake (302 Redirect + Session Cookies)");

  const mockFetchSuccess: typeof fetch = async (url, init) => {
    const headers = new Headers();
    // Simulate WordPress setting authentication cookies and redirecting to /wp-admin/
    headers.append("location", "https://clientbrand.com/wp-admin/");
    headers.append(
      "set-cookie",
      "wordpress_logged_in_abc=auth_token_xyz_123; path=/; domain=clientbrand.com; secure; HttpOnly"
    );
    headers.append(
      "set-cookie",
      "wordpress_sec_abc=sec_token_xyz_456; path=/wp-admin; domain=clientbrand.com; secure; HttpOnly"
    );

    return new Response(null, {
      status: 302,
      headers,
    });
  };

  const successResult = await authenticateWordPressSession(
    {
      targetUrl: "https://clientbrand.com",
      username: "admin_agency",
      password: "MasterPassword123!",
    },
    { fetchFn: mockFetchSuccess }
  );

  assert.strictEqual(successResult.success, true, "Login must succeed");
  assert.strictEqual(successResult.cookies.length, 2, "Must capture 2 session cookies");
  assert.strictEqual(successResult.cookies[0].name, "wordpress_logged_in_abc");
  assert.strictEqual(successResult.cookies[1].name, "wordpress_sec_abc");
  assert.strictEqual(successResult.redirectUrl, "https://clientbrand.com/wp-admin/");
  assert.ok(successResult.cookieHeader.includes("wordpress_logged_in_abc="));
  console.log("   ✔ Headless login succeeded: captured wordpress_logged_in_* & wordpress_sec_* cookies in ephemeral RAM");

  // --- Test 5: Mock Headless Login - Invalid Credentials Scenario ---
  console.log("5. Testing Headless Authentication - Invalid Password Handling (200 OK + login_error)");

  const mockFetchFailure: typeof fetch = async () => {
    const headers = new Headers();
    headers.append("content-type", "text/html; charset=UTF-8");

    const failureHtml = `
      <div id="login_error">Unknown email address. Check again or try your username.</div>
    `;
    return new Response(failureHtml, {
      status: 200,
      headers,
    });
  };

  const failureResult = await authenticateWordPressSession(
    {
      targetUrl: "https://clientbrand.com",
      username: "wrong_user",
      password: "WrongPassword!",
    },
    { fetchFn: mockFetchFailure }
  );

  assert.strictEqual(failureResult.success, false, "Login must fail");
  assert.strictEqual(failureResult.cookies.length, 0, "No cookies should be captured");
  assert.ok(failureResult.error?.includes("Unknown email address"));
  console.log("   ✔ Failed authentication correctly rejected and returned sanitized error");

  // --- Test 6: Network Timeout Handling ---
  console.log("6. Testing Network Timeout & Connection Abort");
  const mockFetchTimeout: typeof fetch = async (_, init) => {
    return new Promise((_, reject) => {
      const signal = init?.signal as AbortSignal;
      signal.addEventListener("abort", () => {
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        reject(abortErr);
      });
    });
  };

  const timeoutResult = await authenticateWordPressSession(
    {
      targetUrl: "https://unreachable-wp-site.xyz",
      username: "admin",
      password: "pwd",
    },
    { timeoutMs: 50, fetchFn: mockFetchTimeout }
  );

  assert.strictEqual(timeoutResult.success, false);
  assert.ok(timeoutResult.error?.includes("timed out"), "Error must indicate timeout");
  console.log("   ✔ Network timeout handled safely without hanging the process");

  console.log("\n🎉 ALL TASK 5.1 HEADLESS WORDPRESS AUTHENTICATOR TESTS PASSED 100%!");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
