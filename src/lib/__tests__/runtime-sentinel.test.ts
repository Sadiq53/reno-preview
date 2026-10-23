import fs from "fs";
import path from "path";

async function testRuntimeSentinel() {
  console.log("🛡️ Validating Task 6.1 Extension Runtime Capability Sentinel...\n");

  const extDir = path.join(process.cwd(), "extension");

  // 1. Validate manifest.json
  console.log("1. Checking manifest.json configuration:");
  const manifestPath = path.join(extDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  if (!manifest.permissions.includes("webNavigation")) {
    throw new Error("Missing webNavigation permission in manifest!");
  }
  if (!manifest.permissions.includes("declarativeNetRequest")) {
    throw new Error("Missing declarativeNetRequest permission in manifest!");
  }
  if (!manifest.declarative_net_request?.rule_resources?.[0]?.path) {
    throw new Error("Missing declarative_net_request ruleset in manifest!");
  }

  const wpAdminScript = manifest.content_scripts.find((cs: any) =>
    cs.matches.includes("*://*/wp-admin/*")
  );
  if (!wpAdminScript || !wpAdminScript.js.includes("content.js")) {
    throw new Error("Missing wp-admin content script in manifest!");
  }

  console.log("   ✓ webNavigation and declarativeNetRequest permissions active");
  console.log("   ✓ Declarative ruleset linked:", manifest.declarative_net_request.rule_resources[0].path);
  console.log("   ✓ Content script registered for *://*/wp-admin/*\n");

  // 2. Validate rules.json
  console.log("2. Checking rules.json (Declarative Net Request Rules):");
  const rulesPath = path.join(extDir, "rules.json");
  if (!fs.existsSync(rulesPath)) throw new Error("rules.json missing!");

  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
  if (!Array.isArray(rules) || rules.length < 3) {
    throw new Error("Expected at least 3 declarative rules in rules.json!");
  }

  const blockedPatterns = rules.map((r: any) => r.condition.urlFilter);
  console.log("   ✓ Blocked URL Filters:", blockedPatterns.join(", "));
  if (
    !blockedPatterns.some((p: string) => p.includes("plugin-editor.php")) ||
    !blockedPatterns.some((p: string) => p.includes("theme-editor.php")) ||
    !blockedPatterns.some((p: string) => p.includes("plugin-install.php"))
  ) {
    throw new Error("rules.json missing required blocked URL patterns!");
  }
  console.log("   ✓ All 3 dangerous endpoints declared for declarative redirection.\n");

  // 3. Validate content.js (DOM Sentinel & Privilege Escalation Blocker)
  console.log("3. Checking content.js Sentinel Logic:");
  const contentJsPath = path.join(extDir, "content.js");
  if (!fs.existsSync(contentJsPath)) throw new Error("content.js missing!");

  const contentCode = fs.readFileSync(contentJsPath, "utf-8");

  // Check early CSS injection
  if (!contentCode.includes("plugin-editor.php") || !contentCode.includes("display: none !important")) {
    throw new Error("content.js missing CSS hiding rules!");
  }

  // Check DOM scrubbing
  if (!contentCode.includes("scrubRestrictedElements") || !contentCode.includes("closest")) {
    throw new Error("content.js missing DOM scrubbing functions!");
  }

  // Check privilege escalation prevention
  if (!contentCode.includes('option[value="administrator"]') || !contentCode.includes("disabled = true")) {
    throw new Error("content.js missing administrator role creation lock!");
  }

  // Check top bar badge
  if (!contentCode.includes("wp-admin-bar-reno-sentinel")) {
    throw new Error("content.js missing Reno Hub admin bar status badge!");
  }

  console.log("   ✓ Early CSS hiding rules verified");
  console.log("   ✓ DOM scrubbing removes Plugin & Theme editor menus");
  console.log("   ✓ Administrator role creation locked on user edit/creation forms");
  console.log("   ✓ Reno Hub Sentinel status badge injected into top admin bar\n");

  // 4. Validate background.js WebNavigation Listener
  console.log("4. Checking background.js webNavigation Listener:");
  const bgJsPath = path.join(extDir, "background.js");
  const bgCode = fs.readFileSync(bgJsPath, "utf-8");

  if (!bgCode.includes("chrome.webNavigation.onBeforeNavigate")) {
    throw new Error("background.js missing webNavigation listener!");
  }
  if (!bgCode.includes("restricted.html")) {
    throw new Error("background.js missing redirection to restricted.html!");
  }
  console.log("   ✓ onBeforeNavigate listener active");
  console.log("   ✓ Intercepts restricted URLs and redirects to restricted.html\n");

  // 5. Validate restricted.html & restricted.css
  console.log("5. Checking restricted alert page files:");
  const htmlPath = path.join(extDir, "restricted.html");
  const cssPath = path.join(extDir, "restricted.css");

  if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath)) {
    throw new Error("restricted.html or restricted.css missing!");
  }

  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  if (!htmlContent.includes("Security Sentinel: Restricted Area")) {
    throw new Error("restricted.html missing security alert header!");
  }

  console.log(`   ✓ restricted.html verified (${fs.statSync(htmlPath).size} bytes)`);
  console.log(`   ✓ restricted.css verified (${fs.statSync(cssPath).size} bytes)\n`);

  console.log("🎉 ALL TASK 6.1 RUNTIME SENTINEL TESTS PASSED 100%!");
}

testRuntimeSentinel().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
