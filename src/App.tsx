import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter, type Route } from './context/RouterContext';
import { Spinner } from './components/ui';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { LiveQueuePage } from './pages/LiveQueuePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminServicesPage } from './pages/admin/AdminServicesPage';
import { AdminTokensPage } from './pages/admin/AdminTokensPage';

const PUBLIC_ROUTES = new Set<Route['name']>(['login', 'register']);
const ADMIN_ROUTES = new Set<Route['name']>(['admin', 'admin-users', 'admin-services', 'admin-tokens']);

function AppContent() {
  const { session, profile, loading } = useAuth();
  const { route, navigate } = useRouter();

  // Redirect logic while auth is loading we render nothing.
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.has(route.name);
    if (!session && !isPublic) {
      navigate({ name: 'login' });
      return;
    }
    if (session && isPublic) {
      navigate({ name: 'dashboard' });
      return;
    }
    // Guard admin routes for admins only.
    if (session && ADMIN_ROUTES.has(route.name) && profile?.role !== 'admin') {
      navigate({ name: 'dashboard' });
    }
  }, [session, profile, loading, route, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-7 w-7 text-brand-600" />
          <p className="text-sm font-medium text-ink-400">Loading QueueFlow…</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.has(route.name);
  if (!session && !isPublic) {
    return <LoginPage />;
  }
  if (session && isPublic) {
    return <DashboardPage />;
  }

  // Admin guard (in case the effect hasn't redirected yet).
  if (ADMIN_ROUTES.has(route.name) && profile?.role !== 'admin') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-bold text-ink-800">Admins only</p>
          <p className="mt-1 text-sm text-ink-500">You don't have access to this area.</p>
        </div>
      </AppShell>
    );
  }

  const page = renderRoute(route);
  return <AppShell>{page}</AppShell>;
}

function renderRoute(route: Route): React.ReactNode {
  switch (route.name) {
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'services':
      return <ServicesPage />;
    case 'service':
      return <ServiceDetailPage serviceId={route.id} />;
    case 'bookings':
      return <BookingsPage />;
    case 'live':
      return <LiveQueuePage />;
    case 'profile':
      return <ProfilePage />;
    case 'admin':
      return <AdminOverviewPage />;
    case 'admin-users':
      return <AdminUsersPage />;
    case 'admin-services':
      return <AdminServicesPage />;
    case 'admin-tokens':
      return <AdminTokensPage />;
    default:
      return <DashboardPage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
