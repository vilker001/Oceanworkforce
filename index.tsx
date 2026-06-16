
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

console.log('[Ocean] index.tsx: module loading...');

try {
  const rootElement = document.getElementById('root');
  console.log('[Ocean] root element found:', !!rootElement);

  if (!rootElement) {
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:red;"><h1>Erro: Elemento #root não encontrado</h1></div>';
    throw new Error("Could not find root element to mount to");
  }

  console.log('[Ocean] creating React root...');
  const root = ReactDOM.createRoot(rootElement);

  console.log('[Ocean] rendering App...');
  root.render(
    <React.StrictMode>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </React.StrictMode>
  );
  console.log('[Ocean] render() called successfully');
} catch (err) {
  console.error('[Ocean] FATAL ERROR during mount:', err);
  document.body.innerHTML = `
    <div style="padding:40px;font-family:sans-serif;">
      <h1 style="color:red;">Erro Fatal de Inicialização</h1>
      <pre style="background:#fee;padding:20px;border-radius:8px;overflow:auto;">${err instanceof Error ? err.stack : String(err)}</pre>
    </div>
  `;
}
