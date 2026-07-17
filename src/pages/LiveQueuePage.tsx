import { useEffect, useState } from 'react';
import { Radio, Activity, Users2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchServices, fetchServiceTokens } from '../lib/api';
import type { ServiceWithCounts, TokenWithRelations } from '../lib/types';
import { formatTokenNumber } from '../lib/types';
import { useRouter } from '../context/RouterContext';
import { Card, SectionHeader, EmptyState, Stat } from '../components/ui';
import { serviceColor } from '../components/QueueCards';

export function LiveQueuePage() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [tokensByService, setTokensByService] = useState<Record<string, TokenWithRelations[]>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const svcs = await fetchServices();
    setServices(svcs);
    const entries = await Promise.all(
      svcs.map(async (s) => [s.id, await fetchServiceTokens(s.id)] as const),
    );
    setTokensByService(Object.fromEntries(entries));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('live-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalWaiting = services.reduce((sum, s) => sum + (s.waiting_count ?? 0), 0);
  const totalServing = services.filter((s) => s.serving_token).length;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<Radio size={20} />}
        title="Live Queue Board"
        subtitle="Real-time view of every service. Updates automatically."
        action={
          <span className="badge bg-brand-100 text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Live
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Services" value={services.length} icon={<Radio size={18} />} />
        <Stat label="Now serving" value={totalServing} icon={<Activity size={18} />} accent="brand" />
        <Stat label="People waiting" value={totalWaiting} icon={<Users2 size={18} />} accent="accent" />
        <Stat label="Open desks" value={services.filter((s) => s.is_active).length} icon={<Radio size={18} />} />
      </div>

      {loading ? (
        <div className="grid-cards">
          {[0, 1, 2].map((i) => <Card key={i} className="h-72 skeleton" />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState icon={<Radio size={26} />} title="No services to display" />
      ) : (
        <div className="grid-cards">
          {services.map((s) => {
            const tokens = tokensByService[s.id] ?? [];
            const serving = tokens.find((t) => t.status === 'serving');
            const waiting = tokens.filter((t) => t.status === 'waiting');
            return (
              <Card
                key={s.id}
                className="group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
                      style={{ backgroundColor: serviceColor(s.prefix) }}
                    >
                      {s.prefix}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{s.name}</p>
                      <p className="text-xs text-ink-400">{waiting.length} waiting</p>
                    </div>
                  </div>
                  <span className={`badge ${s.is_active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                    {s.is_active ? 'Open' : 'Closed'}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-brand-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Now serving</p>
                  <p className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-brand-700">
                    {serving ? formatTokenNumber(s, serving.number) : '—'}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-ink-400">Up next</p>
                  {waiting.slice(0, 3).map((t, i) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-400">#{i + 1}</span>
                        <span className="font-mono text-sm font-semibold text-ink-700">
                          {formatTokenNumber(s, t.number)}
                        </span>
                      </span>
                      <span className="text-xs text-ink-400">
                        {t.profile?.full_name || `@${t.profile?.username ?? ''}`}
                      </span>
                    </div>
                  ))}
                  {waiting.length === 0 && (
                    <p className="rounded-lg bg-ink-50 px-3 py-2 text-center text-xs text-ink-400">
                      Queue is empty
                    </p>
                  )}
                  {waiting.length > 3 && (
                    <p className="px-1 text-xs text-ink-400">+{waiting.length - 3} more waiting</p>
                  )}
                </div>

                <button
                  onClick={() => navigate({ name: 'service', id: s.id })}
                  className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
                >
                  View full queue <ArrowRight size={14} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
