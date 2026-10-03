import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initPWAAutoUpdate } from './pwaUpdateManager';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { logger } from './services/logger';

// Permanently remove any legacy dark-mode class or storage keys
try {
  localStorage.removeItem('notx_theme');
  localStorage.removeItem('theme');
  document.documentElement.classList.remove('dark');
} catch (e) {
  // Ignore in non-browser/restricted environments
}

// Global window unhandled error and promise rejection listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Avoid double-logging if an error was handled or standard script tag loading failures
    if (event.error) {
      logger.captureException(event.error, {
        category: 'unhandled_window_error',
        context: {
          url: event.filename || window.location.href,
        }
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logger.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      category: 'unhandled_promise_rejection',
      level: 'error'
    });
  });
}

// Initialize automatic PWA updates for iOS Home Screen, Android PWA/APK & browsers
initPWAAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </StrictMode>,
);
