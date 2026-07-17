import { useEffect, useState } from 'react';
import { Layers, ArrowLeft, Ticket, Radio, Clock, Users2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchService, fetchServiceTokens, bookToken } from '../lib/api';
import type { Service, TokenWithRelations } from '../lib/types';
import { formatTokenNumber, TOKEN_STATUS_META } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { Card, EmptyState, Button, Toast, Spinner } from '../components/ui';
import { serviceColor } from '../components/QueueCards';

export function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const { navigate } = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [tokens, setTokens] = useState<TokenWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    const [svc, t] = await Promise.all([fetchService(serviceId), fetchServiceTokens(serviceId)]);
    setService(svc);
    setTokens(t);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`service-${serviceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens', filter: `service_id=eq.${serviceId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `id=eq.${serviceId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [serviceId]);

  const waiting = tokens.filter((t) => t.status === 'waiting');
  const serving = tokens.find((t) => t.status === 'serving');
  const eta = waiting.length * (service?.estimated_wait_minutes ?? 0);

  const handleBook = async () => {
    if (!service) return;
    setBooking(true);
    try {
      const t = await bookToken(service.id);
      setToast(`Token ${formatTokenNumber(service, t.number)} booked.`);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not book token.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="text-brand-600" />
      </div>
    );
  }

  if (!service) {
    return (
      <EmptyState
        icon={<Layers size={26} />}
        title="Service not found"
        description="This service may have been removed."
        action={<Button onClick={() => navigate({ name: 'services' })}>Back to services</Button>}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <button
        onClick={() => navigate({ name: 'services' })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={16} /> All services
      </button>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-soft"
            style={{ backgroundColor: serviceColor(service.prefix) }}
          >
            {service.prefix}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{service.name}</h1>
            <p className="mt-1 max-w-lg text-sm text-ink-500">{service.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`badge ${service.is_active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${service.is_active ? 'bg-brand-500' : 'bg-ink-400'}`} />
                {service.is_active ? 'Open' : 'Closed'}
              </span>
              <span className="badge bg-ink-100 text-ink-600"><Clock size={12} /> ~{service.estimated_wait_minutes}m / person</span>
            </div>
          </div>
        </div>
        <Button
          onClick={handleBook}
          loading={booking}
          disabled={!service.is_active}
          icon={!booking && <Ticket size={16} />}
        >
          {booking ? 'Booking…' : 'Book token'}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Radio size={18} className="mx-auto text-brand-600" />
          <p className="mt-2 font-mono text-lg font-bold text-ink-900">
            {serving ? formatTokenNumber(service, serving.number) : '—'}
          </p>
          <p className="text-xs font-medium text-ink-400">Now serving</p>
        </Card>
        <Card className="p-4 text-center">
          <Users2 size={18} className="mx-auto text-ink-500" />
          <p className="mt-2 text-lg font-bold text-ink-900">{waiting.length}</p>
          <p className="text-xs font-medium text-ink-400">Waiting</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock size={18} className="mx-auto text-accent-600" />
          <p className="mt-2 text-lg font-bold text-ink-900">{eta}m</p>
          <p className="text-xs font-medium text-ink-400">Est. wait</p>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-bold text-ink-900">Queue</h2>
      {tokens.length === 0 ? (
        <EmptyState
          icon={<Users2 size={26} />}
          title="Queue is empty"
          description="Be the first to book a token for this service."
          action={service.is_active && <Button onClick={handleBook} loading={booking}>Book token</Button>}
        />
      ) : (
        <Card className="divide-y divide-ink-100">
          {tokens.map((t, idx) => {
            const meta = TOKEN_STATUS_META[t.status];
            const isServing = t.status === 'serving';
            return (
              <div
                key={t.id}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${isServing ? 'bg-brand-50/60' : ''}`}
              >
                <span className="w-6 text-center text-sm font-bold text-ink-400">{idx + 1}</span>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                    isServing ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'
                  }`}
                >
                  {formatTokenNumber(service, t.number).split('-')[1]}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-800">
                    {t.profile?.full_name || `@${t.profile?.username ?? 'user'}`}
                  </p>
                  <p className="text-xs text-ink-400">
                    {t.status === 'waiting' ? `Booked ${new Date(t.booked_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : meta.label}
                  </p>
                </div>
                <span className={`badge ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
