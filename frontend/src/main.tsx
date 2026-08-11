import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SessionProvider } from './context/SessionContext';
import { I18nProvider } from './context/I18nContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <SessionProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SessionProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
