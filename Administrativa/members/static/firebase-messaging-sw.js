importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyALx6YB93kzFpWL7_lfrvfw_9S2e6P9pKU',
  authDomain: 'prueva-c32c2.firebaseapp.com',
  databaseURL: 'https://prueva-c32c2-default-rtdb.firebaseio.com',
  projectId: 'prueva-c32c2',
  storageBucket: 'prueva-c32c2.firebasestorage.app',
  messagingSenderId: '124237857947',
  appId: '1:124237857947:web:a26708c6e579383d3cb23e',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};

  self.registration.showNotification(notification.title || 'Sistema de Aseo Urbano', {
    body: notification.body || 'Tienes una nueva actualización.',
    icon: '/static/images/InicioLogin.svg',
  });
});