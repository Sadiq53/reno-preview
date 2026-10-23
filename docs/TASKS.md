# BUILD TASKS & ROADMAP: RENO HUB

Follow this checklist task-by-task. Each task is a self-contained unit with unambiguous "Done when" verification criteria.

---

## Phase 1: Foundation, Full-Stack Scaffolding & Data Layer

- [x] **Task 1.1: Next.js 14 App Router, TypeScript & Tailwind Setup**
  - **Scope**: Initialize full-stack Next.js App Router configuration with TypeScript, integrating the existing dark-mode design system and CSS tokens from `reno-preview`.
  - **Files**: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`.
  - **Done when**: `npm run dev` boots cleanly; global styles reflect dark theme with glassmorphic variables.

- [x] **Task 1.2: Prisma Database Schema & PostgreSQL Connection**
  - **Scope**: Configure Prisma ORM with models for `User`, `Project`, `ProjectPage`, `Assignment`, `Comment`, `CommentReply`, `ShareLink`, `LoginGrant`, and `AuditLog`. Create database seed script.
  - **Files**: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`.
  - **Done when**: `npx prisma migrate dev` creates tables successfully; `npx prisma db seed` seeds 1 Admin, 1 Developer, and 1 Sample Project.

- [x] **Task 1.3: Cryptographic Service (AES-256-GCM & HMAC-SHA256)**
  - **Scope**: Implement crypto utilities: AES-256-GCM encryption/decryption for site shared secrets, secure random token generation, and canonical HMAC-SHA256 signing for remote WordPress communication.
  - **Files**: `src/lib/crypto.ts`, `src/lib/__tests__/crypto.test.ts`.
  - **Done when**: Unit tests prove secrets round-trip through AES-256-GCM cleanly and HMAC signatures produce correct digests with timing-safe comparison.

- [x] **Task 1.4: Auth.js v5 Setup with Role Guards**
  - **Scope**: Configure Auth.js v5 with credentials/email provider, JWT sessions, and RBAC middleware separating Admin (`/admin`) and Developer (`/developer`) routes.
  - **Files**: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`.
  - **Done when**: Admin login redirects to `/admin`; Developer login redirects to `/developer`; unauthenticated requests to protected paths return 401/redirect.

---

## Phase 2: Project Management & Developer Assignment Core

- [x] **Task 2.1: Admin Project Management (CRUD & Secret Generation)**
  - **Scope**: Create Admin UI and API routes to create, view, edit, and archive projects. Auto-generate 256-bit WordPress shared secret and store it encrypted.
  - **Files**: `src/app/(admin)/projects/page.tsx`, `src/app/(admin)/projects/new/page.tsx`, `src/app/api/projects/route.ts`.
  - **Done when**: Admin can create a project with a target URL; database stores `wpSecretEncrypted`, `wpSecretIv`, and `wpSecretAuthTag`.

- [x] **Task 2.2: Project Pages Directory Manager**
  - **Scope**: Allow Admin to add, reorder, and hide pages for a project (e.g., `/`, `/about`, `/shop`) with validation against the base project URL.
  - **Files**: `src/app/(admin)/projects/[id]/pages/page.tsx`, `src/app/api/projects/[id]/pages/route.ts`.
  - **Done when**: Admin can add `/services` and `/checkout` to a project; pages appear in order and can be toggled hidden.

- [x] **Task 2.3: Developer Roster & Member Management**
  - **Scope**: Admin screen to invite developers, view roster, and manage active account statuses.
  - **Files**: `src/app/(admin)/team/page.tsx`, `src/app/api/team/route.ts`.
  - **Done when**: Admin creates a developer account; temporary credentials are generated and displayed; developer appears in roster.

- [x] **Task 2.4: Time-Bound Project Assignments**
  - **Scope**: Admin interface to assign developers to specific projects with role template (`EDITOR`, `SHOP_MANAGER`, `RESTRICTED_ADMIN`) and expiration timestamp (`expiresAt`).
  - **Files**: `src/app/(admin)/projects/[id]/assignments/page.tsx`, `src/app/api/projects/[id]/assignments/route.ts`.
  - **Done when**: Admin assigns Dev to Project with expiry; developer dashboard immediately reflects only their assigned projects.

---

## Phase 3: Visual Preview & Canvas Annotation Engine

- [x] **Task 3.1: Port & Elevate PreviewWindow (Responsive Viewports, Drag Resize, Zoom & Pan)**
  - **Scope**: Integrate the existing `PreviewWindow` component into Next.js with TypeScript. Support Desktop (1440x900), Tablet (768x1024), Mobile (375x667), interactive drag handles, and scale zoom (25%-200%).
  - **Files**: `src/components/preview/PreviewWindow.tsx`, `src/components/preview/PreviewWindow.module.css`, `src/app/preview/[id]/page.tsx`.
  - **Done when**: Preview loads project website in iframe; switching devices snaps viewport smoothly; drag handles resize fluidly.

- [x] **Task 3.2: Interactive Page Selector & Multi-Viewport TopBar**
  - **Scope**: Port `TopBar` into a Next.js client component with active page dropdown, comment count badges, device switcher, and mode toggle (`Browse` vs `Comment`).
  - **Files**: `src/components/layout/TopBar.tsx`, `src/components/layout/TopBar.module.css`.
  - **Done when**: Changing pages in dropdown updates iframe URL and updates comment count badge.

- [x] **Task 3.3: Normalized Canvas Pin Placement (`posX%`, `posY%`, scroll sync)**
  - **Scope**: Implement click-to-pin coordinate normalizer on the preview canvas. Calculate percentage-based coordinates relative to viewport and scroll offset.
  - **Files**: `src/components/comments/AnnotationMarker.tsx`, `src/components/comments/PinCanvas.tsx`, `src/lib/canvas-math.ts`.
  - **Done when**: Clicking canvas in Comment Mode places an animated pin; pin remains attached to the exact visual element when resizing or zooming.

- [x] **Task 3.4: Comment Drawer, Threaded Replies & Author Avatars**
  - **Scope**: Port and enhance `Sidebar` with full CRUD for comments, threaded replies, author tags, and viewport tags (e.g., "Mobile - 375x667").
  - **Files**: `src/components/comments/CommentSidebar.tsx`, `src/components/comments/CommentCard.tsx`, `src/app/api/comments/route.ts`.
  - **Done when**: Submitting a comment persists to Postgres; comment card displays in sidebar; clicking card scrolls canvas to pin.

- [x] **Task 3.5: Task Progression Workflow & Project Progress Bar**
  - **Scope**: Add status transitions: `PENDING` -> `IN_PROGRESS` -> `RESOLVED`. Update pin visual state (orange for pending, blue for in-progress, green checkmark for resolved) and display overall project progress meter.
  - **Files**: `src/components/dashboard/TaskProgressMeter.tsx`, `src/app/api/comments/[id]/status/route.ts`.
  - **Done when**: Developer marks task resolved; pin changes to green; project progress percentage updates live.

---

## Phase 4: Client Shareable Links & Scoped Access

- [x] **Task 4.1: Share Link Generator API & Token Indexing**
  - **Scope**: Admin modal to generate cryptographically secure share links with role: `VIEWER` or `COMMENTER`, optional expiration date, and instant revoke button.
  - **Files**: `src/components/dashboard/ShareModal.tsx`, `src/app/api/projects/[id]/share/route.ts`.
  - **Done when**: Admin creates a share link; database records unique 256-bit token; URL is copied to clipboard.

- [x] **Task 4.2: Client Preview Layout (`/share/[token]`) with Role Isolation**
  - **Scope**: Public-facing preview route `/share/[token]` that verifies token validity and enforces role capabilities without exposing admin/dev navigation.
  - **Files**: `src/app/share/[token]/page.tsx`, `src/app/share/[token]/layout.tsx`.
  - **Done when**: Client with `VIEWER` link can view pages and pins in read-only mode; cannot submit comments; no admin or WP buttons appear.

- [x] **Task 4.3: Guest Commenter Identity Modal**
  - **Scope**: For `COMMENTER` links, prompt client for their Name and Email before their first pin. Attribute guest comments properly in threads.
  - **Files**: `src/components/comments/GuestIdentityModal.tsx`, `src/app/api/share/[token]/comment/route.ts`.
  - **Done when**: Client enters name; drops a pin; comment appears with "Client" badge in sidebar and notifies assigned team.

---

## Phase 5: Zero-Plugin Access Broker & Browser Companion (Option 2 + Option 4)

- [x] **Task 5.1: Headless WordPress Session Authenticator**
  - **Scope**: Server-side utility that takes decrypted client WordPress credentials and executes a headless login POST to `wp-login.php`, capturing authenticated session cookies (`wordpress_logged_in_*`, `wordpress_sec_*`).
  - **Files**: `src/lib/wp-session.ts`, `src/lib/__tests__/wp-session.test.ts`.
  - **Done when**: Passing valid credentials returns session cookie jar; invalid credentials returns clear error.

- [x] **Task 5.2: Session Grant Token Dispatcher API**
  - **Scope**: Implement `POST /api/broker/launch` (verifies assignment, triggers headless login, creates 60s `LoginGrant`) and `POST /api/broker/session` (claimed by extension in background memory, single-use token consumption).
  - **Files**: `src/app/api/broker/launch/route.ts`, `src/app/api/broker/session/route.ts`.
  - **Done when**: Valid assignment generates grant; claiming token once delivers cookies; replaying token is rejected with 403.

- [x] **Task 5.3: Reno Access Companion Browser Extension (Manifest V3)**
  - **Scope**: Scaffold lightweight Chrome/Edge extension. Background service worker receives grant token, claims cookie jar from broker, and injects cookies into browser jar via `chrome.cookies.set()`.
  - **Files**: `extension/manifest.json`, `extension/background.js`, `extension/popup.html`, `extension/popup.js`.
  - **Done when**: Developer clicks launch in portal; extension injects cookies; target tab opens `https://client.com/wp-admin/` already authenticated.

- [x] **Task 5.4: Fallback Authenticated Reverse Proxy Gateway**
  - **Scope**: Embedded gateway route `/api/proxy/[id]/[...path]` that proxies `/wp-admin/` requests server-side with cached session cookies for developers without the extension.
  - **Files**: `src/app/api/proxy/[id]/[...path]/route.ts`.
  - **Done when**: Developer without extension can view and navigate `/wp-admin/` inside Reno Hub frame.

- [x] **Task 5.5: 1-Click Launch Handshake in Developer Dashboard**
  - **Scope**: Connect "Open WP Admin" button in developer portal to detect extension or fallback to proxy gateway.
  - **Files**: `src/components/dashboard/LaunchWpButton.tsx`, `src/app/(developer)/developer/page.tsx`.
  - **Done when**: Developer clicks button and lands inside WordPress Admin in < 1.5 seconds.

---

## Phase 6: Hardening, Runtime Sentinel & Audit System

- [x] **Task 6.1: Extension Runtime Capability Sentinel**
  - **Scope**: Content script and `webNavigation` listener inside extension that blocks navigation to `/wp-admin/plugin-editor.php`, `/wp-admin/theme-editor.php`, `/wp-admin/plugin-install.php` and hides file editor menus from the WordPress DOM.
  - **Files**: `extension/content.js`, `extension/rules.json`.
  - **Done when**: Logged-in developer cannot access Theme File Editor or Plugin Installer in client dashboard.

- [x] **Task 6.2: Instant Session Revocation & Cookie Clearing**
  - **Scope**: When Admin clicks "Revoke Access", server marks assignment revoked and commands extension to remove all `client.com` cookies via `chrome.cookies.remove()`.
  - **Files**: `src/app/api/broker/revoke/route.ts`, `extension/background.js`.
  - **Done when**: Admin clicks "Revoke"; developer's active WordPress session is terminated immediately.

- [x] **Task 6.3: Centralized Audit Logger**
  - **Scope**: Track every security and login event (`WP_ADMIN_LAUNCHED`, `SESSION_CLAIMED`, `REVOKED`, `EXPIRED_ACCESS_ATTEMPT`).
  - **Files**: `src/lib/audit.ts`.
  - **Done when**: Audit events persist with actor ID, IP address, user agent, and contextual JSON metadata.

- [x] **Task 6.4: Admin Security Audit Log Dashboard & Credential Vault**
  - **Scope**: Admin UI to search and filter audit logs by project, developer, date, and event type. Include credential update modal.
  - **Files**: `src/app/(admin)/audit/page.tsx`, `src/components/admin/CredentialVaultModal.tsx`.
  - **Done when**: Admin can inspect recent login activity in real-time table.

---

## Phase 7: Project Settings Hub & Interactive Kanban Task Board

- [x] **Task 7.1: Database Schema Expansion for Configurations & Unified Tasks**
  - **Scope**: Add project configuration fields to `Project` (default viewport, unframe proxy, share expiration, guest policies) and task fields to `Comment` (title, notes, priority, dueDate, assigneeUser, nullable coordinates for manual tasks).
  - **Files**: `prisma/schema.prisma`, `src/lib/db.ts`.
  - **Done when**: `npx prisma db push` synchronizes PostgreSQL and Prisma Client generates with 0 errors.

- [x] **Task 7.2: Project Settings Hub & Live WP Connection Validator**
  - **Scope**: Comprehensive project settings page (`/admin/projects/[id]/settings`) with General Metadata, Canvas defaults, AES-256-GCM Vaulted Credentials with "Test WP Connection" button, Share policies, and Danger Zone project deletion modal.
  - **Files**: `src/app/(admin)/projects/[id]/settings/page.tsx`, `src/app/api/projects/[id]/route.ts`, `src/app/api/projects/[id]/test-wp/route.ts`.
  - **Done when**: Admin can update configurations, test credentials on-demand, and safely delete projects.

- [x] **Task 7.3: Unified Tasks & Kanban Engine API**
  - **Scope**: REST endpoints returning unified visual canvas annotations and manual tasks, supporting creation, status transitions (`PENDING`, `IN_PROGRESS`, `RESOLVED`), notes attachment, and audit logging.
  - **Files**: `src/app/api/projects/[id]/tasks/route.ts`, `src/app/api/projects/[id]/tasks/[taskId]/route.ts`.
  - **Done when**: Both manual tasks and canvas comments return in unified list and can be updated/deleted.

- [x] **Task 7.4: Interactive Drag-and-Drop Kanban Board UI**
  - **Scope**: Full Kanban board with Pending, In Progress, and Resolved columns, HTML5 drag-and-drop movement with optimistic UI updates, Task Detail Drawer with threaded discussions, and "New Task" modal.
  - **Files**: `src/app/(admin)/projects/[id]/tasks/page.tsx`.
  - **Done when**: Cards drag fluidly across columns, moving a card immediately persists new status in Postgres, and pin annotations link directly to visual canvas coordinates.

- [x] **Task 7.5: Dual-Role Access & Navigation Integration**
  - **Scope**: Update `src/middleware.ts` to allow both Admin and Developer access to `/projects/[id]/tasks`. Add project sub-nav tabs (Pages, Access, Tasks, Settings) and direct "Task Board" shortcut button in Developer Dashboard (`/developer`).
  - **Files**: `src/middleware.ts`, `next.config.mjs`, `src/app/(developer)/developer/page.tsx`, `src/app/(admin)/projects/[id]/pages/page.tsx`, `src/app/(admin)/projects/[id]/assignments/page.tsx`.
  - **Done when**: Both Admin and assigned Developers can access and collaborate on project tasks.

