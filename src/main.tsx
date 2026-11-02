import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';

// Registra o Service Worker do PWA para cache e funcionamento offline
const updateSW = registerSW({
  onNeedRefresh() {
    console.info('Nova versão do Zé das Contas disponível.');
  },
  onOfflineReady() {
    console.info('Zé das Contas pronto para uso offline.');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export { updateSW };
