# ARCHITECTURE DECISION RECORDS (ADRs): RENO HUB

This document records the architectural and design decisions for Reno Hub. These decisions are settled; AI agents and contributors must adhere to them to prevent circular debates.

---

### ADR-001: Next.js App Router Monolith for Unified Portal & Broker
- **Context**: We need a web application serving: (1) Admin project & developer management, (2) Developer task dashboards, (3) Interactive website preview canvas, and (4) High-security credential broker API.
- **Decision**: Use Next.js 14+ (App Router) with TypeScript as a unified full-stack application rather than separate frontend and backend microservices.
- **Rationale**:
  - Eliminates CORS issues between dashboard and API routes.
  - Enables server components for rapid, secure database queries via Prisma.
  - Single deployment target (Vercel, Node.js container, or VPS).
  - Type sharing between database models, API handlers, and UI components.

---

### ADR-002: Reusing & Elevating Reno-Preview UI/Canvas System
- **Context**: The existing `reno-preview` codebase already contains a sleek dark/glassmorphic theme, responsive iframe scaling, device preset toggles (`desktop`, `tablet`, `mobile`), and comment markers.
- **Decision**: Port and enhance these React components into the Next.js App Router structure under `src/components/preview/` and `src/components/comments/` rather than starting UI design from scratch.
- **Rationale**:
  - Preserves user familiarity with the existing Reno design language.
  - Accelerates development by building on tested drag-resizing, zoom, and coordinate calculation algorithms.
  - Ensures seamless continuity for existing visual annotation workflows.

---

### ADR-003: Zero-Plugin Hybrid Architecture — Browser Companion (Option 2) + Authenticated Proxy Gateway (Option 4)
- **Context**: Agency owners only possess standard client WordPress Admin panel logins (`username` + `password`). They have **no hosting / cPanel / SSH / File Manager access**, and **cannot or will not install any plugins** on client WordPress sites (clients may object to foreign plugins, plugin conflicts, or disabled plugin uploads).
- **Decision**: Adopt a zero-plugin hybrid architecture combining:
  1. **Primary: Reno Access Companion (Browser Extension)**: Developers install a lightweight agency Chrome/Edge extension. When the developer clicks "Open WP Admin", Reno Hub verifies the assignment, performs headless server-side authentication against the client's `wp-login.php`, and securely delivers the session cookie set to the extension in background memory. The extension writes the cookies via `chrome.cookies.set()` and opens the client dashboard directly in the developer's browser — **already fully authenticated without the developer ever knowing the password**.
  2. **Fallback: Authenticated Reverse Proxy Gateway**: For developers unable to install the extension, Reno Hub provides an embedded session gateway (`/api/proxy/[id]/wp-admin/...`) that proxies requests server-side, injecting the authenticated session cookies transparently.
- **Rationale**:
  - **Zero client footprint**: Exactly 0 plugins, 0 mu-plugins, and 0 file modifications to client WordPress sites.
  - **Master password protection**: The client's master password remains securely encrypted on the server (AES-256-GCM) and is never rendered in HTML, network payloads, or developer-visible DOM.
  - **Native browsing experience**: The extension avoids proxy URL rewriting loops and preserves native WordPress asset loading.

---

### ADR-004: Ephemeral Session Brokerage & Master Credential Vault
- **Context**: How should master WordPress credentials be stored, and how does the developer gain access without compromising the agency's credentials?
- **Decision**: Store client WordPress admin credentials in PostgreSQL encrypted with AES-256-GCM (`wpAdminUsernameEncrypted`, `wpAdminPasswordEncrypted`). When a developer clicks "Open WP Admin", the server decrypts credentials in ephemeral memory, executes a headless login handshake with `wp-login.php`, captures the resulting session cookies (`wordpress_logged_in_*`, `wordpress_sec_*`), and dispatches them to the authenticated extension with a single-use 60-second grant token.
- **Rationale**:
  - The developer's browser receives session cookies, NOT the master password.
  - Session cookies can be invalidated at any moment by Reno Hub or on remote password rotation.
  - No shared plaintext password spreadsheets or 1Password vault sharing.

---

### ADR-005: Cryptographic Single-Use Session Bridge Handshake
- **Context**: Communication between the Next.js broker and the Reno Browser Companion Extension must be strictly authenticated and replay-proof.
- **Decision**: When "Open WP Admin" is triggered, Reno Hub generates a cryptographically random, SHA-256 hashed single-use token (`LoginGrant`, TTL: 60s). The Extension passes this token to `POST /api/broker/session` to claim the session cookie bundle in background memory.
- **Rationale**:
  - Tokens expire in 60 seconds and are marked `usedAt` on first consumption.
  - Replays are rejected with 403 Forbidden.
  - Guarantees cookies can only be retrieved by the active, verified developer assignment.

---

### ADR-006: Normalized Percentage Positioning for Canvas Annotations
- **Context**: Website preview annotations must remain attached to target elements across different viewport sizes, screen pixel densities, and zoom levels (25% to 200%).
- **Decision**: Store annotation coordinates as normalized percentages `(posX%, posY%)` of the active viewport dimension, accompanied by the target viewport width, height, and scroll offset.
- **Rationale**:
  - Prevents pins from shifting or floating out of view when the canvas scale or browser window changes.
  - Allows easy translation across device viewports when reviewing responsive design bugs.

---

### ADR-007: Tokenized Stateless Client Share Links with Scoped RBAC
- **Context**: Clients must review website pages and visual progress without creating platform accounts or accessing internal agency project data.
- **Decision**: Share links use 256-bit cryptographically secure tokens (`/share/[token]`) with explicit access levels: `VIEWER` (read-only) or `COMMENTER` (guest commenting).
- **Rationale**:
  - Frictionless client onboarding: No passwords or signup forms required.
  - Zero leakage: Share routes strictly omit developer assignments, internal comments, and WordPress login brokers.
  - Revocable in one click by the agency owner.

---

### ADR-008: AES-256-GCM Envelope Encryption for Stored Client Credentials
- **Context**: Client WordPress admin logins must be stored in PostgreSQL. If the database is compromised, remote sites must remain protected.
- **Decision**: Encrypt all client WordPress passwords and usernames using AES-256-GCM with a master server key (`process.env.ENCRYPTION_KEY`), storing `ciphertext`, `iv`, and `authTag`.
- **Rationale**:
  - Authenticated encryption (GCM) guarantees confidentiality and detects tampering.
  - Plaintext credentials only exist in server RAM for microseconds during headless login.

---

### ADR-009: Runtime Capability Sentinel (Extension) + Proxy Guardrails
- **Context**: Since no plugin is installed on the client WordPress site to hook PHP capabilities (`map_meta_cap`), how do we prevent freelancers from editing theme PHP files or installing rogue plugins?
- **Decision**: Enforce guardrails at the client and proxy boundaries:
  1. **Extension Sentinel**: The Reno Access Companion injects a content script on `*.client.com/wp-admin/*`:
     - Blocks navigation to high-risk URLs: `/wp-admin/plugin-install.php`, `/wp-admin/plugin-editor.php`, `/wp-admin/theme-editor.php`.
     - Hides "Theme File Editor", "Plugin File Editor", and "Add New Plugin" sidebar menus.
     - Blocks creating new users with `administrator` role in `/wp-admin/user-new.php`.
  2. **Proxy Gateway**: In proxy mode, requests to file editors or plugin installer endpoints return 403 Forbidden.
- **Rationale**:
  - Provides robust, zero-touch security enforcement without requiring any code execution inside client WordPress hosting.
