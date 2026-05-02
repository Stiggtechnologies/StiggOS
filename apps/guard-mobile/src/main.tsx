import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerSW } from './lib/sw';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker after first paint. The replay event is
// dispatched as a custom 'stigg:replay' window event so App.tsx can pick
// it up without us cross-importing module state from the SW.
registerSW(() => window.dispatchEvent(new Event('stigg:replay')));
