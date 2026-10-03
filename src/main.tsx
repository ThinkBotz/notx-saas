import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initPWAAutoUpdate } from './pwaUpdateManager';

// Permanently remove any legacy dark-mode class or storage keys
try {
  localStorage.removeItem('notx_theme');
  localStorage.removeItem('theme');
  document.documentElement.classList.remove('dark');
} catch (e) {
  // Ignore in non-browser/restricted environments
}

// Initialize automatic PWA updates for iOS Home Screen, Android PWA/APK & browsers
initPWAAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
