import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RoleSelectPage } from '../features/auth/RoleSelectPage';
import { useSession } from '../stores/session';
import { Spinner } from '../components/ui/Spinner';

// Code-splitting por ruta: MapLibre (≈218 KB gzip) solo se descarga al abrir el mapa
const MapPage = lazy(() => import('../features/buyer/MapPage').then((m) => ({ default: m.MapPage })));
const SellerDashboard = lazy(() =>
  import('../features/seller/SellerDashboard').then((m) => ({ default: m.SellerDashboard })),
);
const OpeningCapture = lazy(() =>
  import('../features/seller/OpeningCapture').then((m) => ({ default: m.OpeningCapture })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner full />}>{children}</Suspense>;
}

function RequireAuth() {
  const { user, ready } = useSession();
  if (!ready) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  // el mapa es público: comprador anónimo
  { path: '/mapa', element: <Lazy><MapPage /></Lazy> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/acceso', element: <RoleSelectPage /> },
      { path: '/vendedor', element: <Lazy><SellerDashboard /></Lazy> },
      { path: '/vendedor/apertura/:stallId', element: <Lazy><OpeningCapture /></Lazy> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
