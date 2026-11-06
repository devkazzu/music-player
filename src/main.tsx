import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import './styles/index.css';
import { App } from './App';
import { restoreDeepLink } from '@/lib/deepLink';

// Restore client-side routes opened directly on hosts without SPA rewrites.
restoreDeepLink();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The service worker is skipped in native (Capacitor) builds: the bundle is
// shipped inside the app and a cached shell would go stale after updates.
const serviceWorkerEnabled =
  import.meta.env.PROD &&
  import.meta.env.VITE_DISABLE_SW !== '1' &&
  'serviceWorker' in navigator;

if (serviceWorkerEnabled) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent('hiro:offline-ready'));
      },
    });
  });
}
