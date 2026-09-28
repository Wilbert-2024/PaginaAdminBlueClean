import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {
  getMessaging,
  getToken,
  onMessage,
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyALx6YB93kzFpWL7_lfrvfw_9S2e6P9pKU',
  authDomain: 'prueva-c32c2.firebaseapp.com',
  databaseURL: 'https://prueva-c32c2-default-rtdb.firebaseio.com',
  projectId: 'prueva-c32c2',
  storageBucket: 'prueva-c32c2.firebasestorage.app',
  messagingSenderId: '124237857947',
  appId: '1:124237857947:web:a26708c6e579383d3cb23e',
};

// Copia esta clave desde Firebase Console > Cloud Messaging > Web Push certificates.
const vapidKey = 'BKG6Pp0qVE1NOaaDk55dfcuUQefZ2ihBzgJ_qmQKYNS0mRUtzb_KxO4XL43LDKQg1Kps99ICG4MEzsG9sUaCaCg';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const boton = document.getElementById('activarNotificaciones');
const formularioNotificacion = document.getElementById('formularioNotificacion');
const estadoNotificacion = document.getElementById('estadoNotificacion');
const sendFeedback = document.getElementById('sendFeedback');
const sendFeedbackDialog = document.getElementById('sendFeedbackDialog');
const sendFeedbackSymbol = document.getElementById('sendFeedbackSymbol');
const sendFeedbackTitle = document.getElementById('sendFeedbackTitle');
const sendFeedbackMessage = document.getElementById('sendFeedbackMessage');
const closeSendFeedback = document.getElementById('closeSendFeedback');

const showSendFeedback = (state, title, message) => {
  if (!sendFeedback || !sendFeedbackDialog) {
    return;
  }

  sendFeedback.dataset.state = state;
  sendFeedbackDialog.dataset.state = state;
  sendFeedbackDialog.setAttribute('aria-busy', String(state === 'loading'));
  sendFeedbackTitle.textContent = title;
  sendFeedbackMessage.textContent = message;
  closeSendFeedback.hidden = state === 'loading';

  const iconClass = state === 'loading'
    ? 'fas fa-spinner feedback-spinner'
    : state === 'success'
      ? 'fas fa-check'
      : 'fas fa-exclamation';
  sendFeedbackSymbol.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
  sendFeedback.hidden = false;
  sendFeedback.setAttribute('aria-hidden', 'false');

  if (state === 'loading') {
    sendFeedbackDialog.focus();
  } else {
    closeSendFeedback.focus();
  }
};

const dismissSendFeedback = () => {
  if (!sendFeedback) {
    return;
  }

  sendFeedback.hidden = true;
  sendFeedback.setAttribute('aria-hidden', 'true');
  formularioNotificacion?.querySelector('button[type="submit"]')?.focus();
};

closeSendFeedback?.addEventListener('click', dismissSendFeedback);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sendFeedback && !sendFeedback.hidden && !closeSendFeedback.hidden) {
    dismissSendFeedback();
  }
});

const mostrarMensaje = (texto) => {
  if (typeof window.alert === 'function') {
    window.alert(texto);
  }
};

const obtenerCookie = (nombre) => {
  const cookies = document.cookie.split('; ');
  const cookie = cookies.find((valor) => valor.startsWith(`${nombre}=`));
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
};

const obtenerAutorizacion = async () => {
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error('Inicia sesión antes de administrar notificaciones.');
  }

  return `Bearer ${await auth.currentUser.getIdToken()}`;
};

const mantenerCargaVisible = async (inicio) => {
  const restante = 700 - (performance.now() - inicio);
  if (restante > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, restante));
  }
};

const activarNotificaciones = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    mostrarMensaje('Este navegador no permite notificaciones push.');
    return;
  }

  if (vapidKey.startsWith('PEGA_AQUI')) {
    mostrarMensaje('Primero agrega la clave pública VAPID de Firebase en fcm.js.');
    return;
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    mostrarMensaje('Las notificaciones fueron bloqueadas en el navegador.');
    return;
  }

  const registro = await navigator.serviceWorker.register('/static/firebase-messaging-sw.js');
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registro });

  if (!token) {
    mostrarMensaje('No se pudo generar el token de notificaciones.');
    return;
  }

  localStorage.setItem('fcmToken', token);
  const autorizacion = await obtenerAutorizacion();
  await fetch('/notifications/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': obtenerCookie('csrftoken'),
      Authorization: autorizacion,
    },
    body: new URLSearchParams({ token }),
  });

  boton.classList.add('enabled');
  boton.title = 'Notificaciones activadas';
  mostrarMensaje('Notificaciones activadas correctamente.');

  onMessage(messaging, (payload) => {
    const titulo = payload.notification?.title || 'Nueva notificación';
    const cuerpo = payload.notification?.body || 'Tienes una actualización del sistema.';
    mostrarMensaje(`${titulo}\n${cuerpo}`);
  });
};

boton?.addEventListener('click', () => {
  activarNotificaciones().catch((error) => {
    console.error('FCM:', error);
    mostrarMensaje('No se pudieron activar las notificaciones. Revisa la consola.');
  });
});

formularioNotificacion?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const botonEnviar = formularioNotificacion.querySelector('button[type="submit"]');
  const iconoEnviar = botonEnviar.querySelector('.submit-icon');
  const iconoCargando = botonEnviar.querySelector('.submit-spinner');
  const textoBoton = botonEnviar.querySelector('.submit-label');
  const datos = new FormData(formularioNotificacion);
  const inicioCarga = performance.now();

  botonEnviar.disabled = true;
  botonEnviar.setAttribute('aria-busy', 'true');
  iconoEnviar.hidden = true;
  iconoCargando.hidden = false;
  textoBoton.textContent = 'Enviando...';
  estadoNotificacion.textContent = 'Enviando notificación...';
  showSendFeedback('loading', 'Enviando notificación', 'Estamos enviando el aviso a los dispositivos seleccionados.');

  try {
    const autorizacion = await obtenerAutorizacion();
    const respuesta = await fetch('/notifications/send/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': obtenerCookie('csrftoken'),
        Authorization: autorizacion,
      },
      body: datos,
    });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(resultado.error || 'No se pudo enviar la notificación.');
    }

    await mantenerCargaVisible(inicioCarga);

    estadoNotificacion.textContent = resultado.history_saved
      ? `Enviada a ${resultado.sent} navegador(es) y guardada en el historial.`
      : `Enviada a ${resultado.sent} navegador(es), pero no se pudo guardar en el historial.`;

    const estadoFinal = resultado.failed > 0 && resultado.sent > 0
      ? 'error'
      : resultado.sent > 0
        ? 'success'
        : 'error';
    const mensajeFinal = resultado.history_saved
      ? `Aviso enviado a ${resultado.sent} dispositivo(s) y guardado en el historial.`
      : `Aviso enviado a ${resultado.sent} dispositivo(s), pero no se pudo guardar en el historial.`;
    showSendFeedback(
      estadoFinal,
      estadoFinal === 'success' ? '¡Listo!' : 'Envío incompleto',
      mensajeFinal
    );

    if (resultado.history_record) {
      document.dispatchEvent(new CustomEvent('notification-history:added', {
        detail: resultado.history_record,
      }));
    }

    formularioNotificacion.reset();
  } catch (error) {
    await mantenerCargaVisible(inicioCarga);
    estadoNotificacion.textContent = error.message;
    showSendFeedback('error', 'No se pudo enviar', error.message);
  } finally {
    botonEnviar.disabled = false;
    botonEnviar.setAttribute('aria-busy', 'false');
    iconoEnviar.hidden = false;
    iconoCargando.hidden = true;
    textoBoton.textContent = 'Enviar notificación';
  }
});


