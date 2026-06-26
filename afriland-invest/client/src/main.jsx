import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { setCookie, REF_COOKIE } from './lib/cookies';

// Capturer le code de parrainage (?p=CODE) dès le chargement de la page,
// avant toute redirection du routeur, et le conserver 7 jours.
const refParam = new URLSearchParams(window.location.search).get('p');
let redirecting = false;
if (refParam) {
  setCookie(REF_COOKIE, refParam.trim().toUpperCase(), 7);
  // Rediriger l'utilisateur invité directement vers la page d'inscription.
  if (!window.location.pathname.endsWith('/register')) {
    redirecting = true;
    window.location.replace('/register');
  }
}

if (!redirecting) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
