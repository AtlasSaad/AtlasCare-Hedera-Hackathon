import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/tailwind.css';
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';
import './i18n/config';
import indexedDBManager from './utils/indexedDB';
import offlineQueueManager from './utils/offlineQueue';

// Ensure the root element exists before rendering
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element with id 'root' not found in the document.");
}

const root = ReactDOM.createRoot(rootElement);

// Initialize IndexedDB and offline queue
(async () => {
  try {
    await indexedDBManager.init();
    await offlineQueueManager.init();
    console.log('IndexedDB and offline queue initialized successfully');
  } catch (error) {
    console.error('Failed to initialize IndexedDB or offline queue:', error);
  }
})();

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA (auto updates)
registerSW({ immediate: true });
