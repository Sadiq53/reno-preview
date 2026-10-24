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

    // If the message already includes a notification payload, Firebase SDK / browser displays it automatically.
    // Calling showNotification manually here causes duplicate notifications.
    if (payload.notification) {
      console.log("[firebase-messaging-sw.js] Notification payload handled automatically by Firebase Web SDK");
      return;
    }

    // Only display manual notification for data-only messages
    const title =
      payload.data?.title ||
      "Crewvia Vanguard Alert";

    const body =
      payload.data?.body ||
      payload.data?.message ||
      "New project activity recorded.";

    const targetUrl =
      payload.data?.url ||
      payload.data?.link ||
      payload.fcmOptions?.link ||
      "/";

    const tag =
      payload.data?.tag ||
      (payload.data?.taskId ? `task-${payload.data.taskId}` : null) ||
      (payload.data?.commentId ? `comment-${payload.data.commentId}` : null) ||
      "vanguard-alert";

    const options = {
      body,
      icon: payload.data?.icon || "/favicon.ico",
      badge: payload.data?.badge || "/favicon.ico",
      tag,
      requireInteraction: true,
      renotify: false,
      data: {
        url: targetUrl,
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
