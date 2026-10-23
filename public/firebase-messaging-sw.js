// Scripts for firebase messaging service worker
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase Configuration for Background Service Worker (Crewvia Vanguard)
const firebaseConfig = {
  apiKey: "AIzaSyDDDXvKCIebVWBiVXMx-fwt5AC7vPEfKXI",
  authDomain: "vanguard-ffbb1.firebaseapp.com",
  projectId: "vanguard-ffbb1",
  storageBucket: "vanguard-ffbb1.firebasestorage.app",
  messagingSenderId: "610497724360",
  appId: "1:610497724360:web:366f047517c91b16decafd",
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background Push Handler
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message: ", payload);

    // If Firebase SDK already displayed the notification via payload.notification, avoid race-condition duplicate
    if (payload.notification && payload.notification.title) {
      return;
    }

    const title = payload.data?.title || payload.notification?.title || "Crewvia Vanguard Alert";
    const options = {
      body:
        payload.data?.body ||
        payload.data?.message ||
        payload.notification?.body ||
        "New project activity recorded.",
      icon: payload.notification?.icon || payload.data?.icon || "/favicon.ico",
      badge: payload.notification?.badge || payload.data?.badge || "/favicon.ico",
      tag: payload.data?.tag || `vanguard-${Date.now()}`,
      requireInteraction: true,
      renotify: true,
      data: {
        url: payload.data?.url || payload.data?.link || "/",
      },
    };

    return self.registration.showNotification(title, options);
  });
} catch (err) {
  console.warn("[firebase-messaging-sw.js] FCM background initialization skipped:", err);
}

// Notification Click Handler: Focuses tab or navigates directly to target visual task/link
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
