import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeAccessibilityPreferences } from './lib/accessibility';

// --- CRITICAL ADDITION ---
// This imports your i18n configuration so the Navbar can use translations.
// Make sure the file src/i18n.ts actually exists!
import './i18n'; 

initializeAccessibilityPreferences();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
