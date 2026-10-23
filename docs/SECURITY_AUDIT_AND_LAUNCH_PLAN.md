# Crewvia Vanguard (Reno Hub) — Full Security Audit, Vulnerability Loopholes & Production Launch Plan

**Date**: October 23, 2026  
**Auditor**: Google DeepMind Advanced Agentic Systems  
**Project**: Reno Hub / Crewvia Vanguard (All-in-One Agency Management, Visual Annotator & Zero-Trust WordPress Access Broker)  
**Target Goal**: Production-grade Launch Readiness (0 Errors, 0 Bugs, 0 Security Loopholes)

---

## Executive Summary

A comprehensive architectural and penetration-level security audit was conducted across the entire Crewvia Vanguard codebase:
1. **Next.js 14+ App Core & API Routes** (`/api/broker`, `/api/proxy`, `/api/comments`, `/api/share`, `/api/upload`, `/api/preview-proxy`)
2. **Access Broker & Companion Extension** (`background.js`, `content.js`, `sentinel-main.js`, `rules.json`, `content-bridge.js`)
3. **Database & Authorization Model** (Prisma ORM, PostgreSQL, AES-256-GCM Vault, RBAC)
4. **Visual Preview & Annotation Engine** (`PreviewWindow`, `PinCanvas`, `AnnotationMarker`, `CommentSidebar`)

While the core architecture demonstrates sophisticated zero-knowledge design (ephemeral single-use grant tokens, AES-256-GCM credential vault, dynamic in-flight DNR injection), **9 critical security loopholes and 3 production bugs were identified** that would allow a malicious developer or client to bypass security restrictions, access administrative credentials, or escalate privileges.

All 9 loopholes, along with root causes, proof-of-concept vectors, and exact production fixes, are detailed below.

---

## Part 1: Deep Security Vulnerability & Loophole Audit

### Vulnerability Matrix

| ID | Vulnerability / Loophole | Severity | Surface | Impact |
|---|---|---|---|---|
| **V-01** | Top-Level & Query Parameter REST API Bypass (`wp-json/wp/v2/users`, `?rest_route=`) | **CRITICAL** | Extension DNR (`rules.json`) | Plaintext dump of all WordPress users & emails |
| **V-02** | Arbitrary Plugin / Theme Upload Bypass via `wp-admin/update.php` | **CRITICAL** | Extension & Reverse Proxy | Remote Code Execution (RCE) / Web Shell Upload |
| **V-03** | Reverse Proxy Sentinel Exemption for `users.php`, `user-new.php`, `profile.php`, `options.php` | **CRITICAL** | Reverse Proxy Gateway (`/api/proxy/[id]/...`) | Full User Creation & Database Settings Disclosure |
| **V-04** | Unauthenticated Comments & Missing Role Check on Guest Annotations | **HIGH** | Main Comments API (`/api/comments`, `/api/comments/[id]/status`) | Read-Only Viewers posting comments; Developers resolving arbitrary project tasks |
| **V-05** | Server-Side Request Forgery (SSRF) in Preview Proxy | **HIGH** | `/api/preview-proxy` | Probing cloud metadata (`169.254.169.254`) & internal network infrastructure |
| **V-06** | Unauthenticated File Upload & Path Traversal in `/api/upload` | **HIGH** | File Storage API (`/api/upload`, `storage.ts`) | Disk exhaustion, directory traversal, Stored XSS via `.svg` |
| **V-07** | Wildcard `postMessage` Target Origin in `LaunchWpButton` | **MEDIUM** | Portal Bridge (`LaunchWpButton.tsx`) | Interception of 60s single-use login grant by hostile iframes |
| **V-08** | Global Removal of CSP & X-Frame-Options in Extension Rule 10 | **MEDIUM** | Extension `rules.json` | Developer browser exposed to clickjacking across the web |
| **V-09** | Client Email Exposure via `view-source:` in Chrome | **MEDIUM** | Extension Sentinel (`background.js`) | Bypasses content script DOM masking to view real client email |

---

### Detailed Findings & Technical Root Causes

#### V-01: Top-Level & Query Parameter REST API Bypass
- **Location**: `extension/rules.json` (Rules 9 & 11) and `extension/sentinel-main.js`
- **Root Cause**:
  1. In `rules.json`, Rule 9 blocks `wp-json/wp/v2/users` and Rule 11 blocks `wp-json/wp/v2/settings`, but their `resourceTypes` are restricted to `["xmlhttprequest", "other", "sub_frame"]`. **`"main_frame"` was omitted.**
  2. WordPress REST API supports query-string routing: `/?rest_route=/wp/v2/users` and `/?rest_route=/wp/v2/settings`. `rules.json` contains no rule blocking `rest_route=/wp/v2/users`.
  3. `content.js` and `sentinel-main.js` only match `*://*/wp-admin/*`. They do NOT run on the root frontend URL (`*://*/`).
- **Exploit Scenario**: A developer assigned to a project pastes `https://client-site.com/wp-json/wp/v2/users` or `https://client-site.com/?rest_route=/wp/v2/users` directly into their browser address bar. The dynamic in-flight DNR rule injects the authenticated WordPress admin cookie. WordPress returns the complete JSON array of all registered users, roles, and administrative email addresses.
- **Remediation**:
  - Add `"main_frame"` to resource types in `rules.json`.
  - Add DNR blocking rules for `*rest_route=*wp/v2/users*` and `*rest_route=*wp/v2/settings*`.
  - Intercept in `webNavigation.onBeforeNavigate` within `background.js`.

---

#### V-02: Arbitrary Plugin / Theme Upload Bypass via `update.php`
- **Location**: `extension/rules.json`, `extension/background.js`, `src/lib/proxy/security-sentinel.ts`
- **Root Cause**: `plugin-install.php` and `theme-editor.php` are intercepted, but WordPress actually handles manual `.zip` uploads by POSTing to `/wp-admin/update.php?action=upload-plugin` or `/wp-admin/update.php?action=upload-theme`.
- **Exploit Scenario**: A developer crafts a form or script that submits a POST multipart request containing a `.zip` archive with a PHP backdoor directly to `/wp-admin/update.php?action=upload-plugin`. Because `update.php` was not in the blocked endpoints list, WordPress unzips and installs the plugin, granting full shell access on the client's web server.
- **Remediation**:
  - Block `/wp-admin/update.php` whenever query string includes `upload-plugin` or `upload-theme` in both the extension rules, `background.js` navigation listener, and reverse proxy sentinel.

---

#### V-03: Reverse Proxy Sentinel Exemption for Users, Profiles, and Options
- **Location**: `src/lib/proxy/security-sentinel.ts` (`BLOCKED_SENTINEL_PATHS`) and `src/lib/proxy/bridge-injector.ts` (`generateSentinelCSS`)
- **Root Cause**: In `security-sentinel.ts`, `BLOCKED_SENTINEL_PATHS` only listed `plugin-editor.php`, `theme-editor.php`, `plugin-install.php`, and `users.php?action=create`. It completely omitted `/wp-admin/users.php`, `/wp-admin/user-new.php`, `/wp-admin/user-edit.php`, `/wp-admin/profile.php`, and `/wp-admin/options.php`.
- **Exploit Scenario**: If proxy mode is active or enabled, a developer visiting `/api/proxy/[id]/wp-admin/users.php` sees the complete WordPress user management table and can create administrator accounts or view client emails.
- **Remediation**:
  - Update `BLOCKED_SENTINEL_PATHS` to include `users.php`, `user-new.php`, `user-edit.php`, `profile.php`, `options.php` (excluding `options-*.php`), and `update.php`.
  - Update `generateSentinelCSS()` in `bridge-injector.ts` to hide `#menu-users`, `a[href*="users.php"]`, `a[href*="profile.php"]`, `#wp-admin-bar-my-account`, and mask admin email inputs.

---

#### V-04: Unauthenticated Comments & Missing Role Check on Guest Annotations
- **Location**: `src/app/api/comments/route.ts` and `src/app/api/comments/[id]/status/route.ts`
- **Root Cause**:
  1. `POST /api/comments` accepts guest comments without verifying whether the request originates from a valid client share token with `accessLevel === "COMMENTER"`.
  2. `PATCH /api/comments/[id]/status` checks that the user is logged in, but fails to check whether a `DEVELOPER` user is actively assigned to the target project.
  3. `POST /api/comments/[id]/replies` allows unauthenticated guest replies without validating a share token.
- **Exploit Scenario**:
  - A client given a read-only `Viewer` share link inspects network traffic and sends a POST request directly to `/api/comments` with the project ID, bypassing the read-only restriction.
  - A freelance developer assigned only to Project A sends a PATCH request to `/api/comments/[id]/status` for Project B, resolving or reopening tasks across other clients' projects.
- **Remediation**:
  - In `POST /api/comments`: If unauthenticated, require an `x-share-token` header or token parameter, verify token exists, is not revoked, is not expired, and has `accessLevel === "COMMENTER"`.
  - In `PATCH /api/comments/[id]/status`: If user role is `DEVELOPER`, verify an active, non-revoked assignment exists for that project.
  - In `POST /api/comments/[id]/replies`: Require authenticated session or valid `COMMENTER` share token.

---

#### V-05: Server-Side Request Forgery (SSRF) in Preview Proxy
- **Location**: `src/app/api/preview-proxy/route.ts`
- **Root Cause**: The proxy accepts any `url` parameter and performs a native Node.js HTTP request with `rejectUnauthorized: false` without verifying whether the resolved host is a private/internal IP address.
- **Exploit Scenario**: An attacker passes `/api/preview-proxy?url=http://169.254.169.254/latest/meta-data/` to probe AWS/cloud instance metadata or `/api/preview-proxy?url=http://127.0.0.1:5432` to probe internal services.
- **Remediation**:
  - Validate hostname against private IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`).
  - Block loopback, link-local, and private RFC-1918 addresses before dispatching fetch.

---

#### V-06: Unauthenticated File Upload & Path Traversal in `/api/upload`
- **Location**: `src/app/api/upload/route.ts` and `src/lib/storage.ts`
- **Root Cause**:
  1. `POST /api/upload` has no authentication or share token check. Anyone can upload up to 25MB files.
  2. The `folder` parameter is accepted directly from `formData` and joined with `path.join(process.cwd(), "public", "uploads", folder)`, allowing `../` directory traversal.
  3. `image/svg+xml` is accepted. SVGs stored in `public/uploads` can execute embedded JavaScript when viewed directly, creating a Stored XSS vulnerability.
- **Remediation**:
  - Require authenticated user or valid `COMMENTER` share token.
  - Strictly sanitize `folder` to a safe whitelist (`["task-attachments", "avatars", "screenshots"]`).
  - Disallow SVG or serve uploaded files with `Content-Disposition: attachment` or sanitize XML tags.

---

#### V-07: Wildcard `postMessage` Target Origin in `LaunchWpButton`
- **Location**: `src/components/dashboard/LaunchWpButton.tsx` (Line 303)
- **Root Cause**: `window.postMessage({ type: "RENO_LAUNCH_WP_SESSION", grantToken, ... }, "*")` broadcasts the sensitive single-use grant token with wildcard `"*"` target origin.
- **Remediation**:
  - Replace `"*"` with `window.location.origin`.
  - In `content-bridge.js`, verify `event.origin === window.location.origin`.

---

#### V-08: Global Removal of CSP & X-Frame-Options in Extension Rule 10
- **Location**: `extension/rules.json` (Rule 10)
- **Root Cause**: Rule 10 removes `x-frame-options` and `content-security-policy` for ALL `sub_frame` resources across `<all_urls>`.
- **Remediation**:
  - Remove global Rule 10 from static `rules.json`.
  - Dynamic frame un-framing is properly scoped to active project domains or handled via the server-side preview proxy.

---

#### V-09: Client Email Exposure via `view-source:`
- **Location**: `extension/background.js`
- **Root Cause**: In Chrome, extensions cannot inject content scripts into `view-source:` pages. Opening `view-source:https://client-site.com/wp-admin/options-general.php` renders the unmasked raw HTML containing the client email.
- **Remediation**:
  - In `background.js` (`webNavigation.onBeforeNavigate`), intercept any navigation where `details.url` starts with `view-source:` and contains `wp-admin`, and redirect to `restricted.html`.

---

## Part 2: Extension Deployment Strategy & Architecture Plan

```mermaid
graph TD
    A[Extension Distribution Architecture] --> B[Direct In-App Download (Primary / Immediate)]
    A --> C[Chrome Web Store (Secondary / Enterprise)]
    
    B --> B1[API Route: /api/extension/download]
    B --> B2[Dynamic zip Generation of extension/ folder]
    B --> B3[1-Click Download button in Login Modal & Dashboard]
    B --> B4[Version Checker: /api/extension/version]
    
    C --> C1[Chrome Web Store Developer Listing]
    C --> C2[Permanent Store URL]
    C --> C3[Automatic Chrome Background Updates]
    
    B4 --> D[In-App Update Toast / Banner Engine]
    D --> D1[Compares Installed vs Server Version]
    D --> D2[Prompts Developer to Download Update with 1 Click]
```

### Dual-Tier Hybrid Deployment Strategy

1. **Tier 1 (Immediate / Self-Hosted In-App Distribution)**:
   - Provide an endpoint `/api/extension/download` that packages and streams the extension directory as `crewvia-companion-v1.0.0.zip`.
   - On the developer workspace and login flow, display a prominent **"Download Companion Extension (.zip)"** button with illustrated 3-step setup instructions:
     1. Click **Download Companion (.zip)** (instantly downloads).
     2. Open `chrome://extensions` and enable **Developer Mode**.
     3. Drag and drop the unzipped folder or click **Load unpacked**.
   - Zero external dependencies on Google Web Store approval delays. Ready to launch today.

2. **Tier 2 (Chrome Web Store Listing)**:
   - Package the `extension/` directory into a zip and upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee).
   - Once published, configure `NEXT_PUBLIC_EXTENSION_STORE_URL`.
   - The UI automatically offers both:
     - `Add to Chrome (Official Web Store)`
     - `Direct Download (.zip)` as an instant fallback.

---

## Part 3: Real-Time In-App Extension Update & Notification Engine

1. **Version Manifest Endpoint (`/api/extension/version`)**:
   - Returns `{ latestVersion: "1.0.1", minRequiredVersion: "1.0.0", downloadUrl: "/api/extension/download", releaseNotes: "..." }`.

2. **Client-Side Version Negotiation**:
   - `content-bridge.js` exposes the installed version on the DOM:
     `document.documentElement.setAttribute("data-reno-extension-installed", "1.0.0")`
   - The Vanguard application fetches `/api/extension/version` on load.
   - If `installedVersion < latestVersion`:
     - A sleek amber/emerald update toast appears at the top of the developer dashboard:
       > **⚡ Update Available: Crewvia Companion v1.0.1**  
       > A new version is available with updated security sentinels.  
       > `[Download Update .zip]` &bull; `[View Instructions]` &bull; `[Dismiss]`
     - If `installedVersion < minRequiredVersion`, the `Launch WordPress` button enforces the update before granting new session tokens.

3. **Extension Background Self-Check**:
   - `background.js` checks with `/api/extension/version` on startup and during the 15-minute alarm.
   - If outdated, it sets a badge on the extension icon: `NEW` in amber text, and the popup displays an "Update Available" notification with the download link.

---

## Part 4: Step-by-Step Execution Plan

### Phase 1: Security Sentinel Hardening (Loopholes 1, 2, 3, 8, 9)
- Update `extension/rules.json` to block REST user/settings endpoints across all resource types and query formats.
- Block `update.php` uploads in extension rules, `background.js`, and reverse proxy sentinel.
- Update `src/lib/proxy/security-sentinel.ts` to block users, profiles, and options endpoints.
- Update `generateSentinelCSS` in `bridge-injector.ts` to hide Users/Profile menus.
- In `background.js`, block `view-source:*wp-admin*`.
- Remove global Rule 10 from `rules.json`.

### Phase 2: API & Authorization Hardening (Loopholes 4, 5, 6, 7)
- Require authenticated session or valid `COMMENTER` share token for guest comments in `POST /api/comments` and replies.
- Enforce project assignment check on `PATCH /api/comments/[id]/status`.
- Implement private IP / SSRF filter in `src/app/api/preview-proxy/route.ts`.
- Require authentication and sanitize folder name in `src/app/api/upload/route.ts`.
- Replace `"*"` with `window.location.origin` in `LaunchWpButton.tsx`.

### Phase 3: Extension Packaging, Direct Download & In-App Auto-Update
- Implement `/api/extension/download` with dynamic `.zip` stream.
- Implement `/api/extension/version`.
- Build `ExtensionUpdateBanner.tsx` and integrate into TopBar / dashboard.
- Update `LaunchWpButton.tsx` Install Modal with direct download button.

### Phase 4: Production Polish & Hydration Cleanup
- Add `suppressHydrationWarning` to `<body>` in `src/app/layout.tsx`.
- Add missing routes to `src/middleware.ts` matcher.
