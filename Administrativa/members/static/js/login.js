import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyALx6YB93kzFpWL7_lfrvfw_9S2e6P9pKU',
  authDomain: 'prueva-c32c2.firebaseapp.com',
  databaseURL: 'https://prueva-c32c2-default-rtdb.firebaseio.com',
  projectId: 'prueva-c32c2',
  storageBucket: 'prueva-c32c2.firebasestorage.app',
  messagingSenderId: '124237857947',
  appId: '1:124237857947:web:a26708c6e579383d3cb23e',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const formulario = document.getElementById('formularioLogin');
const mensaje = document.getElementById('mensaje');
const campoPassword = document.getElementById('password');
const botonMostrar = document.getElementById('togglePassword');
const icono = document.getElementById('eye-icon');

const mostrarMensaje = (texto, error = false) => {
  mensaje.textContent = texto;
  mensaje.classList.toggle('error', error);
};

botonMostrar.addEventListener('click', () => {
  const visible = campoPassword.type === 'password';
  campoPassword.type = visible ? 'text' : 'password';
  icono.classList.toggle('fa-eye', !visible);
  icono.classList.toggle('fa-eye-slash', visible);
});

formulario.addEventListener('submit', async (event) => {
  event.preventDefault();

  const correo = document.getElementById('email').value.trim();
  const contrasena = campoPassword.value.trim();

  if (!correo || !contrasena) {
    mostrarMensaje('Completa todos los campos.', true);
    return;
  }

  if (!correo.includes('@')) {
    mostrarMensaje('Escribe un correo válido.', true);
    return;
  }

  mostrarMensaje('Validando acceso...');

  try {
    const persistence = document.getElementById('remember').checked
      ? browserLocalPersistence
      : browserSessionPersistence;

    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, correo, contrasena);
    window.location.href = '/dashboard/';
  } catch (error) {
    const mensajesError = {
      'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
      'auth/invalid-email': 'Escribe un correo válido.',
      'auth/user-not-found': 'No existe un usuario con ese correo.',
      'auth/wrong-password': 'La contraseña no es correcta.',
      'auth/user-disabled': 'Este usuario está deshabilitado.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/operation-not-allowed': 'Activa Correo electrónico/contraseña en Firebase Authentication.',
      'auth/configuration-not-found': 'Firebase Authentication aún no está configurado para este proyecto.',
      'auth/network-request-failed': 'No hay conexión con Firebase. Revisa tu internet.',
    };

    mostrarMensaje(
      mensajesError[error.code] || `Error de Firebase: ${error.code || 'desconocido'}`,
      true,
    );
  }
});
