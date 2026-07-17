import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'dashboard' }
  | { name: 'services' }
  | { name: 'service'; id: string }
  | { name: 'bookings' }
  | { name: 'live' }
  | { name: 'admin' }
  | { name: 'admin-users' }
  | { name: 'admin-services' }
  | { name: 'admin-tokens' }
  | { name: 'profile' };

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = hash.split('/');
  switch (path) {
    case 'login':
      return { name: 'login' };
    case 'register':
      return { name: 'register' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'services':
      return { name: 'services' };
    case 'service':
      return rest[0] ? { name: 'service', id: rest[0] } : { name: 'services' };
    case 'bookings':
      return { name: 'bookings' };
    case 'live':
      return { name: 'live' };
    case 'admin':
      return { name: 'admin' };
    case 'admin-users':
      return { name: 'admin-users' };
    case 'admin-services':
      return { name: 'admin-services' };
    case 'admin-tokens':
      return { name: 'admin-tokens' };
    case 'profile':
      return { name: 'profile' };
    default:
      return { name: 'dashboard' };
  }
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'service':
      return `#/service/${route.id}`;
    default:
      return `#/${route.name}`;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      route,
      navigate: (r) => {
        const hash = routeToHash(r);
        if (window.location.hash !== hash) {
          window.location.hash = hash;
        } else {
          setRoute(r);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }),
    [route],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
