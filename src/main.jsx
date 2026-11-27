import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

// Each portal is loaded only when its route is opened, so the admin code never ships to students.
const App = lazy(() => import('./user/App'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const LoginPage = lazy(() => import('./auth/LoginPage'));

// Works both on "/admin" and under the "/reviews" prefix used on exampreptool.com
const path = window.location.pathname.replace(/^\/reviews(?=\/|$)/, '') || '/';
const portal = new URLSearchParams(window.location.search).get('portal');

let Page = App; // /reviews         -> student reviews portal
if (path.startsWith('/admin') || portal === 'admin') Page = AdminApp; // /reviews/admin
else if (path.startsWith('/login') || portal === 'login') Page = LoginPage; // /reviews/login

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  </StrictMode>
);
