importScripts(
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyB_QxFTO1XycOTphtTsoWT3r-abt1aQlAc",
  authDomain: "khushi-1628.firebaseapp.com",
  projectId: "khushi-1628",
  storageBucket: "khushi-1628.firebasestorage.app",
  messagingSenderId: "454916966428",
  appId: "1:454916966428:web:98ebf5ed0c1d94826c77d9",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const notificationTitle =
    payload.notification?.title || "Khushi";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "You have a new message 💗",

    icon: "/icons/icon-192.png",

    badge: "/icons/icon-192.png",

    data: payload.data || {},
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              "focus" in client
            ) {
              return client.focus();
            }
          }

          if (
            clients.openWindow
          ) {
            return clients.openWindow(
              "/chat"
            );
          }
        })
    );
  }
);