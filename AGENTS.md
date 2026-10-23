# AGENTS.md — Permanent System Directives

## 1. Product Identity & Purpose
**Crewvia Vanguard** (Vanguard Hub) is an all-in-one Agency Management, Visual Website Annotator, and Zero-Trust WordPress Access Broker.
It enables an agency owner (Admin) to:
1. Manage multiple client web projects and website pages without needing hosting, FTP, or file manager access.
2. Provide an interactive live visual preview of client websites where admins, clients, and developers can inspect responsive viewports (Desktop, Tablet, Mobile).
3. Drop visual pin-point comments and task annotations directly onto website pages, with full progress tracking (`pending`, `in_progress`, `resolved`).
4. Generate client-facing shareable preview links with scoped roles: **Viewer** (read-only) or **Commenter** (can pin feedback).
5. Onboard developers/freelancers, assign them to specific projects with expiration dates, and grant them one-click, zero-trust login into WordPress Admin **without ever disclosing master passwords and without installing any plugins on the client's site**, using a hybrid **Browser Companion Extension** and **Fallback Proxy Gateway**.

---

## 2. Tech Stack & Repository Layout
- **Frontend & App Core**: Next.js 14+ (App Router), TypeScript, React 19 / 18, Tailwind CSS + Vanilla CSS (preserving the sleek dark/glassmorphic UI from Crewvia Vanguard).
- **Database & ORM**: PostgreSQL with Prisma ORM.
- **Authentication**: Auth.js (NextAuth v5) for Admin and Developer accounts.
- **Client Sharing**: Cryptographically secure URL token validator (`/share/[token]`) with scoped session cookies (`vanguard_reviewer_name`, `vanguard_guest_identity`).
- **Access Broker (Zero-Plugin Hybrid)**:
  - **Primary**: Crewvia Vanguard Companion Extension (Manifest V3, background service worker, cookie injector via `chrome.cookies.set()`, runtime DOM/URL sentinel).
  - **Fallback**: Authenticated Reverse Proxy Gateway (`/api/proxy/[id]/[...path]`).

### Folder Conventions
```text
reno-preview/
├── AGENTS.md                  # Permanent agent brief & conventions (this file)
├── docs/                      # Architectural specs, product definitions, build tasks
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── TASKS.md
│   └── DECISIONS.md
├── prisma/
│   ├── schema.prisma          # Database schema & indexes
│   └── seed.ts                # Database seeder (Admin, Demo Project, Sample Pages)
├── src/
│   ├── app/
│   │   ├── (auth)/...         # Login, logout, session routes
│   │   ├── (admin)/...        # Owner hub: Projects, Team, Vault, Global Audit
│   │   ├── (developer)/...    # Developer workspace: Assigned projects, Task board
│   │   ├── preview/[id]/...   # Interactive website preview & visual annotator
│   │   ├── share/[token]/...  # Client shareable preview (Viewer vs Commenter)
│   │   └── api/
│   │       ├── broker/...     # Headless login broker, session grant token dispatcher
│   │       ├── proxy/...      # Fallback authenticated reverse proxy gateway
│   │       ├── projects/...   # Project & page management
│   │       ├── comments/...   # Pinpoint annotations & resolution status
│   │       └── share/...      # Share link generation & permission checks
│   ├── components/
│   │   ├── preview/           # PreviewWindow, DeviceToolbar, ZoomPanCanvas
│   │   ├── comments/          # AnnotationMarker, CommentCard, CommentSidebar
│   │   ├── dashboard/         # ProjectCard, TaskProgressMeter, TeamRoster
│   │   └── layout/            # TopBar, Navigation, Modal
│   └── lib/
│       ├── auth.ts            # Auth.js configuration & RBAC guards
│       ├── db.ts              # Prisma singleton client
│       ├── crypto.ts          # AES-256-GCM secret encryption & HMAC-SHA256 signing
│       ├── wp-session.ts      # Server-side headless WordPress login authenticator
│       └── audit.ts           # Centralized audit logger
└── extension/                 # Reno Access Companion (Browser Extension)
    ├── manifest.json          # Manifest V3 (cookies, webNavigation, storage permissions)
    ├── background.js          # Service worker receiving session grant & injecting cookies
    ├── content.js             # Runtime sentinel blocking Theme/Plugin File Editors in WP
    └── popup/                 # Quick status popup
```

---

## 3. Strict Security & Operational Rules
1. **Never Log Secrets or Plain Passwords**:
   - Client site master WordPress credentials MUST be stored AES-256-GCM encrypted in Postgres.
   - Master WordPress credentials MUST NEVER be sent to the developer's browser, rendered in HTML DOM, or exposed in Network responses.
   - Login grant tokens MUST be SHA-256 hashed at rest with maximum TTL of 60 seconds.
2. **Zero Client WordPress Footprint**:
   - Zero plugins, zero `mu-plugins`, and zero file modifications to client WordPress sites.
   - Headless server-to-server login handshakes against `wp-login.php` must run in ephemeral RAM; session cookies are dispatched directly to the extension's background memory.
3. **Runtime Capability Sentinel**:
   - The Reno Access Companion Extension MUST intercept navigation to `/wp-admin/plugin-editor.php`, `/wp-admin/theme-editor.php`, and `/wp-admin/plugin-install.php` and block access.
   - Content scripts MUST hide file editor navigation menus and block administrator user creation.
4. **Client Share Link Isolation**:
   - Client share links MUST NEVER expose developer assignment information, WordPress launch endpoints, or internal audit logs.
   - A `Viewer` link MUST strictly disallow comment submission or mutation.
   - A `Commenter` link allows creating comments and replies, but CANNOT resolve developer tasks or change page settings.
5. **Audit Everything**:
   - Every login dispatch, comment creation/resolution, assignment change, credential update, and share link access MUST generate an immutable `AuditLog` row.

---

## 4. Coding & Architecture Conventions
- **Type Safety**: Strictly typed TypeScript across all components, API routes, and database interactions. Use `zod` for request payload validation.
- **Styling**: Maintain the sleek dark mode, glassmorphic panels, and fluid micro-animations established in `reno-preview`.
- **Responsive Previewing**: Iframe coordinates for annotation pins MUST be normalized to percentage-based coordinates (`posX%`, `posY%`, `viewportWidth`, `viewportHeight`, `scrollY`) so pins remain accurate across zoom and scaling levels.
- **Error Handling**: Use structured JSON error responses `{ error: string, code: string, details?: any }` with appropriate HTTP status codes.

---

## 5. What NOT to Touch Without Confirmation
- Never render plaintext master passwords into HTML, client JSON responses, or browser DOM.
- Never bypass single-use token consumption on session grants.
- Never store raw unencrypted client passwords.
