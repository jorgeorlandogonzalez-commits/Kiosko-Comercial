
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './MainApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorOverlay } from './components/GlobalErrorOverlay';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <GlobalErrorOverlay />
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
