// main.jsx
import { createRoot } from 'react-dom/client';
import App from './App';
import AdminApp from './AdminApp';

const isAdminPortal =
  window.location.pathname.startsWith('/admin') ||
  new URLSearchParams(window.location.search).get('portal') === 'admin';

createRoot(document.getElementById('root')).render(
  isAdminPortal ? <AdminApp /> : <App />
);