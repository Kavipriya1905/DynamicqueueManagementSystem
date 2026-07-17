import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Ticket,
  CalendarCheck,
  Radio,
  Shield,
  Users,
  Layers,
  ClipboardList,
  LogOut,
  Menu,
  UserCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter, type Route } from '../context/RouterContext';

interface NavItem {
  label: string;
  icon: ReactNode;
  route: Route;
  match: string[];
}

const userNav: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, route: { name: 'dashboard' }, match: ['dashboard'] },
  { label: 'Services', icon: <Layers size={18} />, route: { name: 'services' }, match: ['services', 'service'] },
  { label: 'My Bookings', icon: <CalendarCheck size={18} />, route: { name: 'bookings' }, match: ['bookings'] },
  { label: 'Live Queue', icon: <Radio size={18} />, route: { name: 'live' }, match: ['live'] },
];

const adminNav: NavItem[] = [
  { label: 'Overview', icon: <LayoutDashboard size={18} />, route: { name: 'admin' }, match: ['admin'] },
  { label: 'Users', icon: <Users size={18} />, route: { name: 'admin-users' }, match: ['admin-users'] },
  { label: 'Services', icon: <Layers size={18} />, route: { name: 'admin-services' }, match: ['admin-services'] },
  { label: 'Tokens', icon: <ClipboardList size={18} />, route: { name: 'admin-tokens' }, match: ['admin-tokens'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminView = route.name.startsWith('admin');
  const nav = isAdminView ? adminNav : userNav;

  const isActive = (item: NavItem) => item.match.includes(route.name);

  const handleNav = (r: Route) => {
    navigate(r);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo />
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight text-ink-900">QueueFlow</p>
          <p className="text-[11px] font-medium text-ink-400">
            {isAdminView ? 'Admin Console' : 'Queue Management'}
          </p>
        </div>
      </div>

      {profile?.role === 'admin' && (
        <div className="mx-3 mb-2 rounded-xl bg-ink-50 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => handleNav({ name: 'dashboard' })}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                !isAdminView ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              User
            </button>
            <button
              onClick={() => handleNav({ name: 'admin' })}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                isAdminView ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNav(item.route)}
            className={`nav-link w-full text-left ${isActive(item) ? 'nav-link-active' : ''}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <button
          onClick={() => handleNav({ name: 'profile' })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {(profile?.username ?? '?')[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">
              {profile?.full_name || profile?.username}
            </p>
            <p className="truncate text-xs text-ink-400">@{profile?.username}</p>
          </div>
          <ChevronRight size={16} className="text-ink-300" />
        </button>
        <button
          onClick={() => signOut()}
          className="nav-link mt-1 w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-200 bg-white lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-up bg-white shadow-lift">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-200 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-extrabold tracking-tight text-ink-900">QueueFlow</span>
          </div>
          <button
            onClick={() => handleNav({ name: 'profile' })}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
          >
            {(profile?.username ?? '?')[0]?.toUpperCase()}
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
      <Ticket size={18} />
    </span>
  );
}

export function RoleBadge({ role }: { role: 'user' | 'admin' }) {
  if (role !== 'admin') return null;
  return (
    <span className="badge bg-brand-100 text-brand-700">
      <Shield size={12} /> Admin
    </span>
  );
}

export { UserCircle };
