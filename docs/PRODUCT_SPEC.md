# PRODUCT SPECIFICATION: RENO HUB

## 1. Executive Summary & Problem Statement
Web agencies regularly face three critical operational friction points:
1. **Scattered Project & Visual Feedback**: Clients and managers communicate design/content feedback over email, Slack, or separate markup tools, leaving developers confused about *where* changes are needed on responsive pages.
2. **Credential Insecurity & Master Password Leakage**: Agencies share master WordPress admin credentials with freelancers via spreadsheets or password managers. Freelancers retain passwords after contracts conclude, can view sensitive client billing or customer data, and can install malicious or unapproved plugins.
3. **Strict Hosting & Plugin Constraints**: Agency owners typically only possess standard WordPress Admin panel logins. They have **no hosting, cPanel, FTP, or File Manager access**, and **cannot or will not install foreign plugins** on client sites (which trigger client objections, security reviews, or compatibility conflicts).

**Reno Hub** unifies these worlds into a single platform:
- An **Interactive Visual Website Annotator** where project pages can be previewed across desktop, tablet, and mobile with pin-point visual comments.
- A **Project Management Hub** to organize projects, pages, developer assignments, and track pending vs in-progress vs completed tasks.
- A **Client Share Portal** that generates secure links with granular permissions (`Viewer` vs `Commenter`).
- A **Zero-Plugin Zero-Trust WordPress Access Broker (Hybrid: Extension + Proxy)** that lets assigned developers click "Open WP Admin" and log in seamlessly without ever seeing the master credentials and without installing a single plugin on the client WordPress site.

---

## 2. User Roles & Permission Matrix

| Capability | Platform Owner (Admin) | Assigned Developer (Member) | Client (Commenter) | Client (Viewer) |
| :--- | :---: | :---: | :---: | :---: |
| **Create / Delete Projects** | Yes | No | No | No |
| **Manage Team & Invite Devs** | Yes | No | No | No |
| **Assign Devs to Projects** | Yes | No | No | No |
| **Set WP Admin Credentials** | Yes | No | No | No |
| **Manage Project Pages** | Yes | No | No | No |
| **View Website Preview** | Yes | Assigned Projects Only | Tokenized Project Only | Tokenized Project Only |
| **Drop Visual Pin Comments** | Yes | Yes (Assigned Projects) | Yes | No (Read-Only) |
| **Reply to Comments** | Yes | Yes | Yes | No |
| **Update Task Status** (`pending` -> `resolved`) | Yes | Yes | No | No |
| **Generate Client Share Links**| Yes | No | No | No |
| **"Open WP Admin" (Zero-Trust)** | Yes | Yes (If not expired/revoked) | No | No |
| **View Security Audit Logs** | Yes (Global + Site) | No | No | No |

---

## 3. Core Feature Pillars

### Pillar A: Multi-Project & Client Management
- **Dashboard Overview**: Cards for every client project displaying:
  - Project Title, Client Name, and Live Staging URL.
  - Active Developer Assignments with time-to-expiry badges.
  - Task Progress Bar: Count of `Pending`, `In Progress`, and `Resolved` tasks.
  - Quick action buttons: **Open Preview**, **Manage Pages**, **Assignments**, **Client Share**.
- **WordPress Credentials Vault (Zero-Plugin)**:
  - Site Base URL (e.g., `https://staging.clientbrand.com`).
  - WordPress Admin Username & Password stored **AES-256-GCM encrypted**.
  - Credentials verified via automated server-side pre-flight check.
  - Exactly **zero plugins or file modifications** required on the client site.

### Pillar B: Live Interactive Preview & Multi-Page Manager
- **Responsive Viewport Controls**:
  - One-click presets: Desktop (1440x900), Tablet (768x1024), Mobile (375x667).
  - Custom drag-handle resizing with live pixel readout.
  - Canvas zoom (25% to 200%) with pan navigation and keyboard shortcuts (`Ctrl/Cmd +`, `Ctrl/Cmd -`, `Ctrl/Cmd 0`).
- **Page Directory**:
  - Admin specifies which pages of the target website are visible in preview (e.g., `/`, `/about`, `/shop`, `/checkout`).
  - Active page selector dropdown in the top bar with per-page comment counts.
  - Admin can add, hide, or reorder pages per project.

### Pillar C: Visual Canvas Annotation & Pinpoint Comments
- **Pinpoint Markers**:
  - Clicking on the preview canvas while in **Comment Mode** drops an animated, numbered pin at the exact coordinate `(posX%, posY%)`.
  - Captures viewport dimensions (`viewportWidth`, `viewportHeight`) and scroll offset `scrollY` so pins remain locked in place.
- **Comment Rich Card**:
  - Author details (Name, Role: Admin / Developer / Client).
  - Timestamp with relative time.
  - Text description, code snippets, or image attachments.
  - Device/screen tag showing which viewport the comment was dropped on.
- **Collapsible Sidebar**:
  - List of all comments filtered by: Active Page vs All Pages, Status (`Pending`, `In Progress`, `Resolved`), Author.
  - Clicking a comment in the sidebar smoothly scrolls the preview canvas directly to the pin.

### Pillar D: Task Progression & Resolution Lifecycle
- **Status Workflow**:
  - `Pending`: Initial comment submitted by Admin or Client.
  - `In Progress`: Developer has acknowledged and is actively working on the fix.
  - `Resolved`: Developer or Admin marks the issue fixed.
- **Resolution Verification**:
  - When a task is marked resolved, the pin turns green with a checkmark.
  - The project dashboard progress meter updates in real-time.
  - Filter toggle in the top bar allows toggling visibility of resolved comments.

### Pillar E: Client Shareable Links
- **Tokenized Secure Access**:
  - Admin generates a unique share link: `https://hub.agency.com/share/[secure_token]`.
  - Can configure link expiration (e.g., 7 days, 30 days, or never).
  - Can revoke share links instantly.
- **Two Granular Modes**:
  1. **Viewer**: Client can inspect all configured pages across viewports and review comments/progress in read-only mode.
  2. **Commenter**: Client can enter their name/email and drop pins directly on pages to communicate changes without needing a full platform login.
- **Strict Isolation**: Client share routes never display developer assignments, internal hourly logs, or WordPress launch buttons.

### Pillar F: Zero-Trust WordPress Access Broker (Hybrid: Extension + Proxy)
- **The "Open WP Admin" Handshake**:
  1. Assigned developer clicks **"Open WP Admin"** in their project view.
  2. Broker checks assignment status: `now() < expires_at` AND `revoked_at IS NULL`.
  3. Broker decrypts stored client credentials in-memory and executes a server-side headless login handshake against `https://client.com/wp-login.php`.
  4. Server captures valid authentication session cookies (`wordpress_logged_in_*`, `wordpress_sec_*`).
  5. Broker generates a single-use 60-second grant token (`LoginGrant`).
  6. **Primary Delivery (Reno Access Companion Extension)**:
     - The developer's browser extension claims the session cookies in background memory via `POST /api/broker/session`.
     - Extension writes the cookies directly into the browser cookie jar using `chrome.cookies.set()`.
     - Opens `https://client.com/wp-admin/` directly in the developer's browser — **already logged in without ever seeing the master password**.
  7. **Fallback Delivery (Authenticated Reverse Proxy Gateway)**:
     - For environments where the extension cannot be installed, Reno Hub proxies the `/wp-admin/` interface through `/api/proxy/[projectId]/...`, injecting session cookies transparently.
  8. Broker logs an `AuditLog` entry (`WP_ADMIN_LAUNCHED`).

### Pillar G: WordPress Capability Guardrails & Remote Revocation
- **Extension Runtime Sentinel**:
  - Injects a lightweight content script on `*.client.com/wp-admin/*`.
  - Blocks navigation to high-risk admin endpoints:
    - `/wp-admin/plugin-editor.php` (Plugin File Editor)
    - `/wp-admin/theme-editor.php` (Theme File Editor)
    - `/wp-admin/plugin-install.php` (Add New Plugin)
  - Hides sensitive menu items from the WordPress admin sidebar.
  - Prevents creating new users with the `administrator` role.
- **Instant Revocation**:
  - Admin clicks **Revoke Access** on any developer assignment.
  - Broker invalidates all active session grants.
  - Extension immediately clears the client site cookies from the developer's browser via `chrome.cookies.remove()`.

### Pillar H: Comprehensive Audit Trail
- Log every security and operational event:
  - `LOGIN_REQUESTED`, `LOGIN_SUCCEEDED`, `LOGIN_REVOKED`, `ASSIGNMENT_CREATED`, `ASSIGNMENT_EXPIRED`, `COMMENT_ADDED`, `TASK_RESOLVED`, `SHARE_LINK_ACCESSED`.
- Displays actor, target site, IP address, user agent, and timestamp.

---

## 4. Entity Data Model

```text
User
├── id: UUID (PK)
├── email: String (Unique)
├── name: String
├── passwordHash: String
├── role: Enum (ADMIN, DEVELOPER)
├── avatarUrl: String?
├── createdAt: DateTime
└── updatedAt: DateTime

Project
├── id: UUID (PK)
├── name: String (e.g. "Acme Corp Redesign")
├── clientName: String
├── targetUrl: String (e.g. "https://staging.acmecorp.com")
├── wpUsernameEncrypted: String (AES-256-GCM)
├── wpUsernameIv: String
├── wpUsernameAuthTag: String
├── wpPasswordEncrypted: String (AES-256-GCM)
├── wpPasswordIv: String
├── wpPasswordAuthTag: String
├── status: Enum (ACTIVE, ARCHIVED)
├── createdAt: DateTime
└── updatedAt: DateTime

ProjectPage
├── id: UUID (PK)
├── projectId: UUID (FK -> Project.id)
├── path: String (e.g. "/about-us")
├── fullUrl: String
├── title: String
├── isDefault: Boolean
├── isHidden: Boolean
├── displayOrder: Int
└── createdAt: DateTime

Assignment
├── id: UUID (PK)
├── projectId: UUID (FK -> Project.id)
├── userId: UUID (FK -> User.id)
├── wpRoleTemplate: Enum (EDITOR, SHOP_MANAGER, RESTRICTED_ADMIN)
├── expiresAt: DateTime
├── revokedAt: DateTime?
├── createdAt: DateTime
└── updatedAt: DateTime

Comment
├── id: UUID (PK)
├── projectId: UUID (FK -> Project.id)
├── pageId: UUID (FK -> ProjectPage.id)
├── authorUserId: UUID? (FK -> User.id, null if client)
├── guestAuthorName: String? (If client commenter)
├── guestAuthorEmail: String?
├── content: String
├── posX: Float (Normalized 0-100 percentage)
├── posY: Float (Normalized 0-100 percentage)
├── viewportWidth: Int (e.g. 1440, 768, 375)
├── viewportHeight: Int
├── scrollY: Int
├── status: Enum (PENDING, IN_PROGRESS, RESOLVED)
├── resolvedAt: DateTime?
├── resolvedByUserId: UUID? (FK -> User.id)
├── createdAt: DateTime
└── updatedAt: DateTime

CommentReply
├── id: UUID (PK)
├── commentId: UUID (FK -> Comment.id)
├── authorUserId: UUID? (FK -> User.id)
├── guestAuthorName: String?
├── content: String
└── createdAt: DateTime

ShareLink
├── id: UUID (PK)
├── projectId: UUID (FK -> Project.id)
├── token: String (Unique, Indexed)
├── accessLevel: Enum (VIEWER, COMMENTER)
├── expiresAt: DateTime?
├── isRevoked: Boolean (Default false)
└── createdAt: DateTime

LoginGrant
├── id: UUID (PK)
├── tokenHash: String (SHA-256)
├── assignmentId: UUID (FK -> Assignment.id)
├── expiresAt: DateTime (60s TTL)
├── usedAt: DateTime?
└── createdAt: DateTime

AuditLog
├── id: UUID (PK)
├── userId: UUID? (FK -> User.id)
├── projectId: UUID? (FK -> Project.id)
├── action: String
├── ipAddress: String
├── userAgent: String
├── metadata: Json?
└── timestamp: DateTime
```

---

## 5. Acceptance Criteria

### Project & Assignment Management
- [ ] Admin can create a new project with client name, live site URL, and encrypted WordPress admin credentials.
- [ ] Admin can invite a developer and assign them to one or more projects with a defined expiry timestamp.
- [ ] Developer sees only assigned projects in their dashboard.
- [ ] If an assignment expires or is revoked, developer access is cut off immediately.

### Preview & Commenting Engine
- [ ] Preview window loads website pages in an iframe with Desktop, Tablet, and Mobile viewport presets.
- [ ] Admin and assigned developers can toggle **Comment Mode** to click anywhere on the page and place a pin.
- [ ] Pins maintain position accurately when switching viewports or resizing the canvas.
- [ ] Updating a comment status from `pending` to `in_progress` or `resolved` reflects in the project progress bar.

### Client Shareable Links
- [ ] Admin can create a shareable link with access level `Viewer` or `Commenter`.
- [ ] Client opening a `Viewer` link can navigate pages and view comments but cannot add or edit comments.
- [ ] Client opening a `Commenter` link is prompted for their name and can drop pins and reply to comments.
- [ ] Share links never display developer assignments or WordPress login buttons.

### Zero-Plugin Zero-Trust WordPress Access (Hybrid)
- [ ] Assigned developer sees an "Open WP Admin" button on their project dashboard.
- [ ] Clicking "Open WP Admin" causes the server to execute a headless login handshake with `wp-login.php` without exposing the master password to the client.
- [ ] Server issues a single-use 60s session grant token.
- [ ] Reno Access Companion Extension claims the session cookies in background memory and injects them via `chrome.cookies.set()`.
- [ ] Developer tab navigates to `https://client.com/wp-admin/` already authenticated.
- [ ] Extension content script blocks `/wp-admin/theme-editor.php` and `/wp-admin/plugin-editor.php`.
- [ ] Fallback Proxy Gateway allows in-browser authenticated proxying if extension is not installed.
- [ ] Admin clicking "Revoke Access" severs access and commands the extension to delete active client cookies.
- [ ] Every login dispatch is recorded in `AuditLog` with IP and timestamp.
