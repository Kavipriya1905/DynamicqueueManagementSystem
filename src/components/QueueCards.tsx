import { Clock, Users2, Hash } from 'lucide-react';
import type { Service, ServiceWithCounts, TokenWithRelations } from '../lib/types';
import { formatTokenNumber, TOKEN_STATUS_META } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { Card } from './ui';

export function ServiceCard({
  service,
  onBook,
  booking,
}: {
  service: ServiceWithCounts;
  onBook?: (s: Service) => void;
  booking?: boolean;
}) {
  const { navigate } = useRouter();
  const waiting = service.waiting_count ?? 0;
  const serving = service.serving_token;
  const eta = waiting * service.estimated_wait_minutes;

  return (
    <Card className="group flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
          style={{ backgroundColor: serviceColor(service.prefix) }}
        >
          {service.prefix}
        </div>
        <span
          className={`badge ${service.is_active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${service.is_active ? 'bg-brand-500' : 'bg-ink-400'}`} />
          {service.is_active ? 'Open' : 'Closed'}
        </span>
      </div>

      <h3 className="mt-4 text-base font-bold text-ink-900">{service.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-500">
        {service.description || 'General service desk.'}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-50 p-3 text-center">
        <Stat icon={<Users2 size={14} />} label="Waiting" value={waiting} />
        <Stat icon={<Hash size={14} />} label="Now" value={serving ? formatTokenNumber(service, serving.number) : '—'} />
        <Stat icon={<Clock size={14} />} label="ETA" value={`${eta}m`} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate({ name: 'service', id: service.id })}
          className="btn-secondary flex-1"
        >
          View queue
        </button>
        {onBook && (
          <button
            onClick={() => onBook(service)}
            disabled={booking || !service.is_active}
            className="btn-primary flex-1"
          >
            {booking ? 'Booking…' : 'Book token'}
          </button>
        )}
      </div>
    </Card>
  );
}

export function TokenCard({
  token,
  service,
  onCancel,
  canceling,
}: {
  token: TokenWithRelations;
  service?: Service;
  onCancel?: (id: string) => void;
  canceling?: boolean;
}) {
  const svc = token.service ?? service;
  const meta = TOKEN_STATUS_META[token.status];
  const { navigate } = useRouter();

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {svc?.name ?? 'Service'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink-900">
            {svc ? formatTokenNumber(svc, token.number) : `#${token.number}`}
          </p>
        </div>
        <span className={`badge ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Field label="Booked" value={new Date(token.booked_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} />
        <Field label="Called" value={token.called_at ? new Date(token.called_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'} />
      </div>

      {token.notes && (
        <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">{token.notes}</p>
      )}

      <div className="mt-4 flex gap-2">
        {svc && (
          <button onClick={() => navigate({ name: 'service', id: svc.id })} className="btn-secondary flex-1">
            View queue
        </button>
        )}
        {onCancel && (token.status === 'waiting') && (
          <button
            onClick={() => onCancel(token.id)}
            disabled={canceling}
            className="btn-danger flex-1"
          >
            {canceling ? 'Cancelling…' : 'Cancel token'}
          </button>
        )}
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-ink-400">{icon}</p>
      <p className="mt-1 text-sm font-bold text-ink-900">{value}</p>
      <p className="text-[11px] font-medium text-ink-400">{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className="mt-0.5 font-medium text-ink-800">{value}</p>
    </div>
  );
}

const PALETTE: Record<string, string> = {
  A: '#16a37a',
  B: '#0b8363',
  C: '#f98312',
  D: '#dd6307',
  E: '#515a72',
  F: '#42495d',
};
export function serviceColor(prefix: string): string {
  return PALETTE[prefix.toUpperCase()] ?? '#16a37a';
}
