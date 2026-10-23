# Crewvia Vanguard Companion — Deployment & Developer Update Guide

This document provides a complete, foolproof operational manual on how the **Crewvia Vanguard Companion Browser Extension** is distributed, deployed, installed, and updated across developers and administrators.

---

## 1. Where Are the Download Buttons Located in the Web App?

The companion extension download is natively integrated into multiple high-visibility locations across the web application:

### A. Developer Portal Header (Always Accessible)
* **Location**: Top right of the navigation header on all `/developer/*` pages ([DeveloperHeader.tsx](file:///d:/crewvia-works/reno-preview/src/components/layout/DeveloperHeader.tsx)).
* **Button**: `Extension [.zip]` button with a puzzle icon and download badge.
* **Profile Dropdown**: Also accessible inside the developer avatar dropdown menu under **"Companion Extension (.zip)"**.

### B. Admin Hub Header (Always Accessible)
* **Location**: Top right of the navigation header on all `/admin/*`, `/projects/*`, `/team/*` pages ([AppHeader.tsx](file:///d:/crewvia-works/reno-preview/src/components/layout/AppHeader.tsx)).
* **Button**: `Extension [.zip]` button next to *New Project*.
* **Profile Dropdown**: Also accessible inside the Owner avatar dropdown menu under **"Companion Extension (.zip)"**.

### C. WP Admin Launch Modal (Interactive Onboarding)
* **Location**: Whenever a developer clicks **"Login to WP Admin"** ([LaunchWpButton.tsx](file:///d:/crewvia-works/reno-preview/src/components/dashboard/LaunchWpButton.tsx)) on any assigned project and the extension is not yet detected.
* **Element**: A dedicated **"Download Companion Extension (.zip)"** card with a 1-click download button and 3 numbered installation steps.
* **Auto-Detection**: The modal monitors `chrome.runtime` pings in the background. As soon as the developer loads the extension, the modal turns emerald green (*"Extension Detected in Real-Time!"*) and auto-connects.

### D. Global Update Banner (Automatic Outdated Detection)
* **Location**: Top banner across the entire web portal ([ExtensionUpdateBanner.tsx](file:///d:/crewvia-works/reno-preview/src/components/extension/ExtensionUpdateBanner.tsx)).
* **Trigger**: Automatically appears if a developer's installed extension version is lower than the server's published version.
* **Action**: Displays release notes with a direct **"Download Update (.zip)"** button and dismiss option.

---

## 2. How the In-App Dynamic Packaging Works Under the Hood

You do **NOT** need to manually zip files or upload them to external storage (S3, Dropbox, etc.) every time you make changes. The application handles packaging dynamically:

```text
[Extension Source Code] -> [GET /api/extension/download] -> [Dynamic Archiver] -> [crewvia-vanguard-companion-v1.0.0.zip]
     (extension/)                     (Next.js API)                (In-Memory Zip)               (Browser Download)
```

1. **Source Directory**: The extension code resides directly in the `extension/` folder of the repository.
2. **Packaging Endpoint**: `GET /api/extension/download` ([src/app/api/extension/download/route.ts](file:///d:/crewvia-works/reno-preview/src/app/api/extension/download/route.ts)) reads `extension/manifest.json` to get the version string.
3. **Automated Filtering**: Uses `archiver` with maximum compression (level 9), bundling all scripts, icons, HTML, and rules while automatically filtering out OS junk (`.DS_Store`, `Thumbs.db`) and Chrome cache (`_metadata/`).
4. **Instant Stream**: Streams the `.zip` archive directly to the client with `Content-Disposition: attachment; filename="crewvia-vanguard-companion-v{version}.zip"`.

---

## 3. Deployment Strategy: Where and How Do You Deploy It?

You have two deployment strategies depending on your operational preference:

### Strategy 1: Direct In-App Self-Hosted (Recommended — Ready Now)
* **How it Works**: The extension is deployed **along with your Next.js application**.
* **Prerequisites**: Zero. No Chrome Web Store developer account, no waiting for Google review, no external hosting costs.
* **Deployment Step**:
  When you deploy your Next.js app to your production server (VPS, Railway, Render, AWS, Docker), ensure the `extension/` folder is included in the project directory. Next.js will automatically serve the download at `https://your-domain.com/api/extension/download`.
* **Who Can Use It**: Works across all Chromium-based browsers:
  - Google Chrome
  - Brave Browser
  - Microsoft Edge
  - Opera / Vivaldi / Arc

---

### Strategy 2: Chrome Web Store (Optional for Public One-Click Install)
If you want developers to click "Add to Chrome" directly from Google's official store:

1. **Register Developer Account**:
   - Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
   - Pay Google's one-time $5 developer registration fee.
2. **Get the Packaged Zip**:
   - Visit `https://your-domain.com/api/extension/download` to download the clean `.zip`.
3. **Upload Item**:
   - Click **Add new item** in the console and upload the `.zip` file.
   - Set Title: `Crewvia Vanguard Companion`.
   - Set Visibility: **Unlisted** (only people with the direct link can install it) or **Public**.
4. **Privacy & Permissions Justification**:
   - `cookies`: Required to inject ephemeral session cookies for zero-trust WordPress access.
   - `declarativeNetRequest`: Required to block file editor and user creation exploits.
   - Single Purpose Description: *"Zero-trust enterprise access broker and visual audit companion for Crewvia Vanguard portal."*
5. **Publish**: Google review takes between 24 and 48 hours. Once published, you receive a store URL:
   `https://chromewebstore.google.com/detail/crewvia-vanguard-companion/<extension-id>`

---

## 4. What Developers Need to Do: Step-by-Step

### Initial Installation (Takes < 60 seconds)
1. **Download**: Click **Extension (.zip)** in the top navigation bar or the WP Login modal.
2. **Extract**: Unzip the downloaded `crewvia-vanguard-companion-v1.0.0.zip` to a folder on their machine (e.g. `Documents/CrewviaExtension`).
3. **Open Extensions Page**:
   - In Google Chrome / Brave: Open a new tab to `chrome://extensions`
   - In Microsoft Edge: Open `edge://extensions`
4. **Enable Developer Mode**: Toggle the **Developer mode** switch in the top-right corner.
5. **Load Extension**: Click **Load unpacked** (top-left) and select the unzipped folder.
6. **Done**: Return to the Vanguard Portal. The system immediately detects the extension and lights up green.

---

## 5. What Happens When You Update the Extension?

When you make modifications to any extension files (`background.js`, `content.js`, `rules.json`, etc.):

### Step 1: You (The Owner / Admin)
1. Edit the files in `extension/`.
2. Bump the version number in `extension/manifest.json`:
   ```json
   {
     "manifest_version": 3,
     "name": "Crewvia Vanguard Companion",
     "version": "1.0.1"
   }
   ```
3. Commit and deploy your Next.js application:
   ```bash
   git add .
   git commit -m "feat(extension): update zero-trust sentinels v1.0.1"
   git push origin main
   ```

### Step 2: What the Software Does (Automated)
* The portal's `/api/extension/version` endpoint immediately detects the new version `1.0.1`.
* When any developer visits or refreshes the portal:
  - The installed extension's `content-bridge.js` announces its version (`1.0.0`).
  - The web application compares `1.0.0 < 1.0.1`.
  - The amber **Extension Update Available** banner immediately slides down at the top of their screen:
    > *"Extension Update Available: Vanguard Companion v1.0.1 is ready (you have v1.0.0). [Download Update (.zip)]"*

### Step 3: What the Developer Needs to Do (2 Clicks)
1. The developer clicks **Download Update (.zip)** directly from the banner.
2. They unzip the contents into their existing extension folder (overwriting the files).
3. In `chrome://extensions`, they click the **Reload (↻)** icon on the Crewvia Vanguard card.
4. **Done!** The banner automatically disappears, and the portal reflects the updated version in real time.

---

## 6. Summary of Key Files

| File | Purpose |
|---|---|
| [extension/manifest.json](file:///d:/crewvia-works/reno-preview/extension/manifest.json) | Declares version, permissions, background service worker, and content scripts. |
| [src/app/api/extension/download/route.ts](file:///d:/crewvia-works/reno-preview/src/app/api/extension/download/route.ts) | Dynamic in-memory packaging and streaming of the extension `.zip`. |
| [src/app/api/extension/version/route.ts](file:///d:/crewvia-works/reno-preview/src/app/api/extension/version/route.ts) | Returns server's latest version and release notes for client negotiation. |
| [src/components/extension/ExtensionUpdateBanner.tsx](file:///d:/crewvia-works/reno-preview/src/components/extension/ExtensionUpdateBanner.tsx) | Live client-side update banner comparing installed vs remote version. |
| [src/components/dashboard/LaunchWpButton.tsx](file:///d:/crewvia-works/reno-preview/src/components/dashboard/LaunchWpButton.tsx) | Zero-trust launch button, real-time extension listener, and install modal. |
| [src/components/layout/AppHeader.tsx](file:///d:/crewvia-works/reno-preview/src/components/layout/AppHeader.tsx) | Admin navigation header with 1-click Extension download button & dropdown item. |
| [src/components/layout/DeveloperHeader.tsx](file:///d:/crewvia-works/reno-preview/src/components/layout/DeveloperHeader.tsx) | Developer navigation header with 1-click Extension download button & dropdown item. |
