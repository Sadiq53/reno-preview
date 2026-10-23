/**
 * Firebase Client SDK Initialization (FCM Web Push & Firebase Storage)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDDDXvKCIebVWBiVXMx-fwt5AC7vPEfKXI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vanguard-ffbb1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vanguard-ffbb1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vanguard-ffbb1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "610497724360",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:610497724360:web:366f047517c91b16decafd",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-05Q217J2LR",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("Dummy")
  );
};

let app: FirebaseApp | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== "undefined") {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    storage = getStorage(app);
  } catch (err) {
    console.warn("[Firebase] Client initialization warning:", err);
  }
}

export { app, storage };

/**
 * Requests FCM notification permission and registers the background Web Push token.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[FCM] Firebase Cloud Messaging is not supported in this browser environment.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("[FCM] Notification permission dismissed or denied:", permission);
      return null;
    }

    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    const messaging = getMessaging(app);

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const registration = await registerServiceWorker();

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      // Save token to backend for authenticated user
      await fetch("/api/notifications/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          device: `${navigator.userAgent.slice(0, 80)}`,
        }),
      }).catch(() => {});
      return currentToken;
    }
    return null;
  } catch (err) {
    console.warn("[FCM] Error retrieving registration token:", err);
    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.warn("[FCM] Service worker registration failed:", err);
    }
  }
  return undefined;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return () => {};

  isSupported().then((supported) => {
    if (!supported || !app) return;
    try {
      const messaging = getMessaging(app);
      return onMessage(messaging, (payload) => {
        callback(payload);
      });
    } catch {
      // Ignore if messaging unsupported
    }
  });

  return () => {};
}
