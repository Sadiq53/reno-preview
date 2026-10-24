/**
 * Firebase Admin SDK Initialization
 * Handles server-side background FCM Web Push dispatch and Firebase Storage bucket uploads.
 * Supports:
 *  1. `serviceAccountKey.json` placed in the project root directory
 *  2. `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_PATH` path
 *  3. `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable (raw JSON string or base64)
 *  4. Individual environment variables (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`)
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";
import prisma from "@/lib/db";

// Singleton container on globalThis to avoid multiple initializations in dev hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __renoFirebaseAdminApp: App | null | undefined;
  // eslint-disable-next-line no-var
  var __renoFirebaseConfigSource: string | undefined;
}

interface ServiceAccountData {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  source: string;
}

/**
 * Resolves service account credentials from files or environment variables.
 */
function resolveServiceAccount(): ServiceAccountData | null {
  const cwd = process.cwd();

  // 1. Check explicit filepath from env vars
  const explicitPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath) ? explicitPath : path.join(cwd, explicitPath);
    if (fs.existsSync(resolved)) {
      try {
        const raw = fs.readFileSync(resolved, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vanguard-ffbb1",
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
            source: `file:${path.basename(resolved)}`,
          };
        }
      } catch (err) {
        console.warn(`[Firebase Admin] Failed parsing credentials from ${explicitPath}:`, err);
      }
    }
  }

  // 2. Check well-known JSON files in project root
  const candidateFilenames = [
    "serviceAccountKey.json",
    "serviceAccountKey.json.json",
    "serviceaccountkey.json",
    "service-account.json",
    "firebase-service-account.json",
  ];

  for (const filename of candidateFilenames) {
    const candidatePath = path.join(cwd, filename);
    if (fs.existsSync(candidatePath)) {
      try {
        const raw = fs.readFileSync(candidatePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vanguard-ffbb1",
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
            source: `file:${filename}`,
          };
        }
      } catch (err) {
        console.warn(`[Firebase Admin] Failed parsing ${filename}:`, err);
      }
    }
  }

  // Also check if any *adminsdk*.json file exists in root
  try {
    const rootFiles = fs.readdirSync(cwd);
    const adminSdkFile = rootFiles.find(
      (f) => f.endsWith(".json") && (f.includes("adminsdk") || f.includes("firebase-adminsdk"))
    );
    if (adminSdkFile) {
      const filePath = path.join(cwd, adminSdkFile);
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vanguard-ffbb1",
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          source: `file:${adminSdkFile}`,
        };
      }
    }
  } catch {}

  // 3. Check FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON or Base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let content = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (!content.startsWith("{")) {
        // Attempt base64 decode
        content = Buffer.from(content, "base64").toString("utf-8");
      }
      const parsed = JSON.parse(content);
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vanguard-ffbb1",
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          source: "env:FIREBASE_SERVICE_ACCOUNT_KEY",
        };
      }
    } catch (err) {
      console.warn("[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  }

  // 4. Check individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
      source: "env:FIREBASE_CLIENT_EMAIL",
    };
  }

  return null;
}

/**
 * Get or initialize the singleton Firebase Admin App
 */
function getFirebaseAdmin(): App | null {
  if (globalThis.__renoFirebaseAdminApp !== undefined) {
    return globalThis.__renoFirebaseAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    globalThis.__renoFirebaseAdminApp = existingApps[0];
    return globalThis.__renoFirebaseAdminApp;
  }

  const creds = resolveServiceAccount();
  if (!creds) {
    globalThis.__renoFirebaseAdminApp = null;
    return null;
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${creds.projectId}.firebasestorage.app`;

  try {
    const app = initializeApp({
      credential: cert({
        projectId: creds.projectId,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
      storageBucket,
    });

    globalThis.__renoFirebaseAdminApp = app;
    globalThis.__renoFirebaseConfigSource = creds.source;
    console.info(`[Firebase Admin] Initialized successfully via ${creds.source} (project: ${creds.projectId})`);
    return app;
  } catch (err) {
    console.warn("[Firebase Admin] Initialization failed:", err);
    globalThis.__renoFirebaseAdminApp = null;
    return null;
  }
}

/**
 * Diagnostics helper for health endpoints and developer logs
 */
export function getFirebaseAdminStatus(): {
  isConfigured: boolean;
  source: string;
  projectId?: string;
  clientEmail?: string;
} {
  const creds = resolveServiceAccount();
  if (!creds) {
    return {
      isConfigured: false,
      source: "none",
    };
  }
  return {
    isConfigured: true,
    source: creds.source,
    projectId: creds.projectId,
    clientEmail: creds.clientEmail,
  };
}

export { getFirebaseAdmin };

/**
 * Dispatch background Web Push notifications via Firebase Cloud Messaging (FCM)
 */
export async function sendFcmNotification(params: {
  tokens: string[];
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}): Promise<{ successCount: number; failureCount: number }> {
  const { tokens, title, body, link, data = {} } = params;
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const app = getFirebaseAdmin();
  if (!app) {
    // FCM credentials not yet supplied in env or serviceAccountKey.json; skip background push gracefully
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const messaging = getMessaging(app);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vanguard.crewvia.in");
    const cleanAppUrl = appUrl.replace(/\/$/, "");
    const iconUrl = `${cleanAppUrl}/favicon.ico`;
    const fullLink = link
      ? link.startsWith("http")
        ? link
        : `${cleanAppUrl}${link.startsWith("/") ? "" : "/"}${link}`
      : cleanAppUrl;

    const deterministicTag = (data as any)?.taskId
      ? `task-${(data as any).taskId}`
      : (data as any)?.commentId
      ? `comment-${(data as any).commentId}`
      : (data as any)?.projectId
      ? `project-${(data as any).projectId}`
      : `vanguard-${(data as any)?.type || "alert"}`;

    const messagePayload: MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        notification: {
          title,
          body,
          icon: iconUrl,
          badge: iconUrl,
          requireInteraction: true,
          tag: deterministicTag,
        },
        fcmOptions: {
          link: fullLink,
        },
      },
      data: {
        ...data,
        title,
        body,
        link: fullLink,
        url: fullLink,
        tag: deterministicTag,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await messaging.sendEachForMulticast(messagePayload);

    // Clean up stale / unregistered tokens automatically from DB
    const staleTokens: string[] = [];
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error) {
        const code = resp.error.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          staleTokens.push(tokens[idx]);
        }
      }
    });

    if (staleTokens.length > 0) {
      prisma.fcmToken.deleteMany({
        where: { token: { in: staleTokens } },
      }).catch((cleanupErr) => {
        console.warn("[FCM Admin] Failed cleaning up stale tokens:", cleanupErr);
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error("[FCM Admin] Failed to send push message:", err);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Upload a document or image to Firebase Storage bucket
 */
export async function uploadToFirebaseStorage(params: {
  buffer: Buffer;
  destinationPath: string;
  contentType: string;
}): Promise<string | null> {
  const app = getFirebaseAdmin();
  if (!app) {
    return null;
  }

  try {
    const bucket = getStorage(app).bucket();
    const file = bucket.file(params.destinationPath);

    await file.save(params.buffer, {
      contentType: params.contentType,
      metadata: {
        contentType: params.contentType,
      },
      public: true,
    });

    try {
      await file.makePublic();
    } catch {
      // Bucket might have uniform access controls enabled
    }

    return `https://storage.googleapis.com/${bucket.name}/${params.destinationPath}`;
  } catch (err) {
    console.error("[Firebase Storage Admin] Upload error:", err);
    return null;
  }
}
