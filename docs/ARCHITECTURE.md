# SYSTEM ARCHITECTURE: RENO HUB

## 1. High-Level System Architecture (Zero-Plugin Hybrid)

```mermaid
graph TD
    subgraph ClientLayer [Client & Access Layer]
        Admin[Agency Owner / Admin]
        Dev[Freelancer / Developer]
        Client[Client / Stakeholder]
    end

    subgraph Hub [Reno Hub - Next.js App Router Monolith]
        UI[Tailwind & React UI Canvas]
        Auth[Auth.js Session & RBAC Guard]
        ShareGuard[Share Token Validation Engine]
        API_Proj[Projects & Pages API]
        API_Comment[Visual Comments & Tasks API]
        API_Broker[Headless Login Broker & Grant Dispatcher]
        API_Proxy[Authenticated Reverse Proxy Gateway]
        Crypto[AES-256-GCM Vault Service]
    end

    subgraph DeveloperBrowser [Developer Browser Environment]
        Ext[Reno Access Companion - Manifest V3 Extension]
        ExtCookie[chrome.cookies API Injector]
        ExtSentinel[Runtime DOM & URL Sentinel]
        DevTab[WordPress Admin Browser Tab]
    end

    subgraph Storage [Persistence Layer]
        PG[(PostgreSQL Database via Prisma)]
    end

    subgraph RemoteWP [Client WordPress Site - 100% Core Only]
        WPLogin[Native wp-login.php Endpoint]
        WPAdmin[Native /wp-admin/ Dashboard]
    end

    Admin -->|Manage Projects, Team, Secrets| Auth
    Dev -->|View Tasks, Open WP Admin| Auth
    Client -->|View/Comment on Preview| ShareGuard

    Auth --> UI
    ShareGuard --> UI

    UI --> API_Proj
    UI --> API_Comment
    UI --> API_Broker

    API_Proj --> PG
    API_Comment --> PG
    API_Broker --> Crypto
    Crypto --> PG

    %% Headless Server-to-Server Authentication
    API_Broker -->|1. Headless POST Credentials| WPLogin
    WPLogin -->|2. Returns Auth Cookies| API_Broker

    %% Primary Extension Delivery Path
    API_Broker -->|3. Dispatches 60s Session Grant| Ext
    Ext --> ExtCookie
    ExtCookie -->|4. Injects Cookies into Browser Jar| DevTab
    ExtSentinel -->|5. Blocks Theme/Plugin File Editors| DevTab
    DevTab -->|6. Authenticated Requests| WPAdmin

    %% Fallback Reverse Proxy Delivery Path
    Dev -->|Fallback Mode| API_Proxy
    API_Proxy -->|Proxies with Auth Cookies| WPAdmin
```

---

## 2. Visual Preview & Annotation Subsystem

### 2.1 Canvas Math & Coordinate Normalization
In visual web annotators, fixed pixel coordinates fail when switching between viewports or scaling zoom. 
Reno Hub uses **normalized percentage coordinates** combined with target viewport metadata:

```typescript
// Coordinate calculation when a pin is placed on the canvas
interface RawClickEvent {
  clientX: number;
  clientY: number;
  canvasRect: DOMRect;
  scrollOffset: number;
  activeViewportWidth: number;
  activeViewportHeight: number;
}

export function calculateNormalizedPosition(e: RawClickEvent) {
  const relativeX = e.clientX - e.canvasRect.left;
  const relativeY = (e.clientY - e.canvasRect.top) + e.scrollOffset;

  return {
    // Stored as percentage of current viewport (0.00% to 100.00%)
    posX: Number(((relativeX / e.activeViewportWidth) * 100).toFixed(2)),
    posY: Number(((relativeY / e.activeViewportHeight) * 100).toFixed(2)),
    viewportWidth: e.activeViewportWidth,
    viewportHeight: e.activeViewportHeight,
    scrollY: Math.round(e.scrollOffset),
  };
}
```

### 2.2 Rendering Pins on Canvas
When rendering an `AnnotationMarker` over the preview iframe:
- `left = ${pin.posX}%`
- `top = ${pin.posY * (activeViewportHeight / 100)}px`
- CSS `transform: translate(-50%, -100%)` anchors the needle of the pin exactly to the target element.

---

## 3. Client Share Link Security & Permission Scoping

### 3.1 Token Generation & Cryptography
Share links use a CSPRNG token generated via Node's `crypto.randomBytes(32).toString('base64url')` (256 bits of entropy).
Tokens are indexed in the `ShareLink` table:
- Lookups take `O(1)` time.
- Route: `/share/[token]`.

### 3.2 Role Matrix for Share Links
```mermaid
graph TD
    Req[Visitor hits /share/:token] --> Validate{Token valid & not expired?}
    Validate -- No --> 404[Return 404 / Expired]
    Validate -- Yes --> CheckRole{Access Level?}
    CheckRole -- VIEWER --> RenderViewer[Render Preview Canvas in Read-Only Mode]
    CheckRole -- COMMENTER --> PromptGuest[Prompt Guest for Name / Email]
    PromptGuest --> RenderCommenter[Render Preview with Pin Annotation Enabled]
```
- **Isolated Surface**: The `/share/[token]` layout does **not** import any project manager navigation, developer assignment drawers, or WordPress broker buttons.

---

## 4. Zero-Plugin Hybrid WordPress Access Broker (Option 2 + Option 4)

### 4.1 Primary Handshake Sequence Diagram (Extension Mode)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Freelancer (Developer)
    participant Hub as Reno Hub (Next.js Broker)
    participant DB as Postgres (Prisma)
    participant Ext as Reno Access Companion (Extension)
    participant WP as Client WordPress (Native Core)
    participant Browser as Developer's Active Browser Tab

    Dev->>Hub: Clicks "Open WP Admin"
    Hub->>DB: Check User Session & active Assignment (expiresAt > now, revokedAt == null)
    
    alt Assignment Invalid or Expired
        Hub-->>Dev: 403 Forbidden ("Access expired or revoked")
    else Assignment Valid
        Hub->>DB: Fetch Project.wpCredentialsEncrypted & targetUrl
        Hub->>Hub: Decrypt admin credentials using AES-256-GCM in ephemeral RAM
        
        Note over Hub,WP: Server-to-Server Headless Authentication
        Hub->>WP: POST https://client.com/wp-login.php
        Note over Hub,WP: Body: log=admin_user&pwd=MasterPassword&rememberme=forever
        WP-->>Hub: HTTP 302 Redirect + Set-Cookie headers<br/>(wordpress_logged_in_*, wordpress_sec_*)
        
        Hub->>Hub: Package session cookie jar
        Hub->>DB: Create LoginGrant (60s TTL, single-use token hash)
        Hub-->>Dev: Return { grantToken, targetUrl: "https://client.com/wp-admin/" }
        
        Note over Dev,Ext: Background Session Claim
        Dev->>Ext: Dispatch window.postMessage with grantToken
        Ext->>Hub: POST /api/broker/session (Headers: grantToken)
        Hub->>DB: Mark LoginGrant usedAt = now()
        Hub-->>Ext: 200 OK { cookies: [wordpress_logged_in_*, wordpress_sec_*] }
        
        Note over Ext,Browser: Native Cookie Jar Injection
        loop Each Cookie
            Ext->>Browser: chrome.cookies.set({ domain: "client.com", name, value, path, secure, httpOnly })
        end
        
        Ext->>Browser: chrome.tabs.create({ url: "https://client.com/wp-admin/" })
        Browser->>WP: GET https://client.com/wp-admin/ (with native cookies)
        WP-->>Browser: Render WordPress Admin Dashboard (Fully Authenticated)
        
        Note over Ext,Browser: Runtime Security Sentinel
        Ext->>Browser: Inject Content Script guarding wp-admin
        Browser->>Browser: Sentinel blocks /plugin-editor.php, /theme-editor.php, /plugin-install.php
    end
```

### 4.2 Fallback Handshake Sequence Diagram (Proxy Gateway Mode)

For environments where installing the extension is restricted, Reno Hub operates as an **authenticated reverse proxy gateway**:
```mermaid
sequenceDiagram
    autonumber
    actor Dev as Freelancer (Developer)
    participant Proxy as Reno Hub Proxy Gateway (/api/proxy/[id]/...)
    participant WP as Client WordPress (Native Core)

    Dev->>Proxy: GET /api/proxy/[id]/wp-admin/
    Proxy->>Proxy: Verify Dev session & active assignment
    Proxy->>Proxy: Attach cached session cookies for client site
    Proxy->>WP: Forward request to https://client.com/wp-admin/
    WP-->>Proxy: Return HTML response + admin assets
    Proxy->>Proxy: Rewrite links & strip file editor endpoints
    Proxy-->>Dev: Render authenticated WP Admin within Reno Hub frame
```

### 4.3 Runtime Security Sentinel (Extension Guardrails)
Since no `mu-plugin` exists on the WordPress site, security restrictions are enforced on the client side by the Reno Access Companion extension:
1. **URL Interception**: Background script hooks `chrome.webNavigation.onBeforeNavigate`:
   - If URL matches `*/wp-admin/plugin-editor.php*`, `*/wp-admin/theme-editor.php*`, or `*/wp-admin/plugin-install.php*`:
     - Aborts navigation and displays a sleek Reno Hub security modal: `"Restricted Area: File editing and plugin installations are locked by your agency owner."`
2. **DOM Sentinel**: Injected content script removes dangerous navigation elements:
   - Removes `#menu-plugins ul li:has(a[href="plugin-install.php"])`
   - Removes `#menu-plugins ul li:has(a[href="plugin-editor.php"])`
   - Removes `#menu-appearance ul li:has(a[href="theme-editor.php"])`
   - Disables creating new users with the `administrator` role.
3. **Instant Cookie Clearing**:
   - When assignment expires or Admin clicks "Revoke", Reno Hub notifies the extension, which immediately calls `chrome.cookies.remove()` for all `client.com` cookies, terminating the developer's session immediately.

---

## 5. Database Schema (Prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  DEVELOPER
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

enum CommentStatus {
  PENDING
  IN_PROGRESS
  RESOLVED
}

enum ShareAccessLevel {
  VIEWER
  COMMENTER
}

enum WpRoleTemplate {
  EDITOR
  SHOP_MANAGER
  RESTRICTED_ADMIN
}

model User {
  id               String       @id @default(uuid())
  email            String       @unique
  name             String
  passwordHash     String
  role             Role         @default(DEVELOPER)
  avatarUrl        String?
  assignments      Assignment[]
  commentsAuthored Comment[]    @relation("CommentAuthor")
  commentsResolved Comment[]    @relation("CommentResolver")
  repliesAuthored  CommentReply[]
  auditLogs        AuditLog[]
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}

model Project {
  id                      String        @id @default(uuid())
  name                    String
  clientName              String
  targetUrl               String
  wpAdminUsernameEncrypted String
  wpAdminUsernameIv       String
  wpAdminUsernameAuthTag  String
  wpAdminPasswordEncrypted String
  wpAdminPasswordIv       String
  wpAdminPasswordAuthTag  String
  status                  ProjectStatus @default(ACTIVE)
  pages                   ProjectPage[]
  assignments             Assignment[]
  comments                Comment[]
  shareLinks              ShareLink[]
  auditLogs               AuditLog[]
  createdAt               DateTime      @default(now())
  updatedAt               DateTime      @updatedAt
}

model ProjectPage {
  id           String    @id @default(uuid())
  projectId    String
  project      Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  path         String
  fullUrl      String
  title        String
  isDefault    Boolean   @default(false)
  isHidden     Boolean   @default(false)
  displayOrder Int       @default(0)
  comments     Comment[]
  createdAt    DateTime  @default(now())

  @@unique([projectId, path])
}

model Assignment {
  id             String         @id @default(uuid())
  projectId      String
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId         String
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  wpRoleTemplate WpRoleTemplate @default(RESTRICTED_ADMIN)
  expiresAt      DateTime
  revokedAt      DateTime?
  loginGrants    LoginGrant[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@unique([projectId, userId])
}

model Comment {
  id                 String        @id @default(uuid())
  projectId          String
  project            Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  pageId             String
  page               ProjectPage   @relation(fields: [pageId], references: [id], onDelete: Cascade)
  authorUserId       String?
  authorUser         User?         @relation("CommentAuthor", fields: [authorUserId], references: [id], onDelete: SetNull)
  guestAuthorName    String?
  guestAuthorEmail   String?
  content            String        @db.Text
  posX               Float
  posY               Float
  viewportWidth      Int
  viewportHeight     Int
  scrollY            Int           @default(0)
  status             CommentStatus @default(PENDING)
  resolvedAt         DateTime?
  resolvedByUserId   String?
  resolvedByUser     User?         @relation("CommentResolver", fields: [resolvedByUserId], references: [id], onDelete: SetNull)
  replies            CommentReply[]
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

model CommentReply {
  id               String   @id @default(uuid())
  commentId        String
  comment          Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  authorUserId     String?
  authorUser       User?    @relation(fields: [authorUserId], references: [id], onDelete: SetNull)
  guestAuthorName  String?
  content          String   @db.Text
  createdAt        DateTime @default(now())
}

model ShareLink {
  id          String           @id @default(uuid())
  projectId   String
  project     Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  token       String           @unique
  accessLevel ShareAccessLevel @default(VIEWER)
  expiresAt   DateTime?
  isRevoked   Boolean          @default(false)
  createdAt   DateTime         @default(now())
}

model LoginGrant {
  id           String     @id @default(uuid())
  tokenHash    String
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  sessionDataEncrypted String @db.Text
  sessionDataIv        String
  sessionDataAuthTag   String
  expiresAt    DateTime   // 60-second TTL
  usedAt       DateTime?
  createdAt    DateTime   @default(now())
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  action    String
  ipAddress String
  userAgent String
  metadata  Json?
  timestamp DateTime @default(now())
}
```
