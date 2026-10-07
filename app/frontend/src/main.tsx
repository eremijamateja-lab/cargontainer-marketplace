import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { initSupabaseAuth } from './lib/supabase.ts';

// Load runtime configuration before rendering the app
async function initializeApp() {
  try {
    await loadRuntimeConfig();
    console.log('Runtime configuration loaded successfully');
  } catch (error) {
    console.warn(
      'Failed to load runtime configuration, using defaults:',
      error
    );
  }

  // Supabase mode: restore/refresh the shared session before any page calls the API
  try {
    await initSupabaseAuth();
  } catch (error) {
    console.warn('Supabase session restore failed:', error);
  }

  // Render the app
  createRoot(document.getElementById('root')!).render(<App />);
}

// Initialize the app
initializeApp();
