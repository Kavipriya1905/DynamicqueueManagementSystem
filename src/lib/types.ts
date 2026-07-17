export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  prefix: string;
  estimated_wait_minutes: number;
  is_active: boolean;
  next_number: number;
  created_at: string;
  updated_at: string;
}

export type TokenStatus = 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';

export interface Token {
  id: string;
  service_id: string;
  user_id: string;
  number: number;
  status: TokenStatus;
  notes: string | null;
  booked_at: string;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface TokenWithRelations extends Token {
  service?: Service;
  profile?: Profile;
}

export interface ServiceWithCounts extends Service {
  waiting_count?: number;
  serving_token?: Token | null;
}

export const TOKEN_STATUS_META: Record<
  TokenStatus,
  { label: string; badge: string; dot: string; color: string }
> = {
  waiting: {
    label: 'Waiting',
    badge: 'bg-ink-100 text-ink-700',
    dot: 'bg-ink-400',
    color: 'text-ink-600',
  },
  serving: {
    label: 'Now Serving',
    badge: 'bg-brand-100 text-brand-700',
    dot: 'bg-brand-500',
    color: 'text-brand-600',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-ink-100 text-ink-500',
    dot: 'bg-ink-300',
    color: 'text-ink-500',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
    color: 'text-red-600',
  },
  no_show: {
    label: 'No Show',
    badge: 'bg-accent-100 text-accent-700',
    dot: 'bg-accent-500',
    color: 'text-accent-600',
  },
};

export function formatTokenNumber(service: Pick<Service, 'prefix'>, number: number): string {
  return `${service.prefix}-${String(number).padStart(3, '0')}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = Math.round((d - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
