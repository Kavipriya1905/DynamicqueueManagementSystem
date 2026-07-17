import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Layers, ClipboardList, Radio, Clock, ArrowRight, TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchServices, fetchAllTokens, fetchProfiles } from '../../lib/api';
import type { ServiceWithCounts, TokenWithRelations, Profile, TokenStatus } from '../../lib/types';
import { formatTokenNumber, TOKEN_STATUS_META, formatDate } from '../../lib/types';
import { useRouter } from '../../context/RouterContext';
import { Card, SectionHeader, Stat, EmptyState } from '../../components/ui';
import { serviceColor } from '../../components/QueueCards';

export function AdminOverviewPage() {
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [tokens, setTokens] = useState<TokenWithRelations[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, t, p] = await Promise.all([fetchServices(), fetchAllTokens(), fetchProfiles()]);
    setServices(s);
    setTokens(t);
    setProfiles(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const today = new Date().toDateString();
  const todayTokens = tokens.filter((t) => new Date(t.created_at).toDateString() === today);
  const statusCounts = tokens.reduce<Record<TokenStatus, number>>(
    (acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; },
    { waiting: 0, serving: 0, completed: 0, cancelled: 0, no_show: 0 },
  );
  const completed = statusCounts.completed;
  const completionRate = tokens.length > 0 ? Math.round((completed / tokens.length) * 100) : 0;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-ink-400">Loading overview…</div>;
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<LayoutDashboard size={20} />}
        title="Admin Overview"
        subtitle="Monitor your queue system health and activity."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total users" value={profiles.length} icon={<Users size={18} />} accent="brand" />
        <Stat label="Admins" value={adminCount} icon={<Users size={18} />} />
        <Stat label="Services" value={services.length} icon={<Layers size={18} />} />
        <Stat label="Tokens today" value={todayTokens.length} icon={<TrendingUp size={18} />} accent="accent" />
        <Stat label="Waiting now" value={statusCounts.waiting} icon={<Clock size={18} />} accent="accent" />
        <Stat label="Completion" value={`${completionRate}%`} icon={<Radio size={18} />} accent="brand" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(TOKEN_STATUS_META) as TokenStatus[]).map((st) => {
          const meta = TOKEN_STATUS_META[st];
          return (
            <Card key={st} className="p-4">
              <span className={`badge ${meta.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <p className="mt-2 text-2xl font-bold text-ink-900">{statusCounts[st] ?? 0}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Service activity</h2>
            <button onClick={() => navigate({ name: 'admin-services' })} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Manage <ArrowRight size={14} />
            </button>
          </div>
          <Card className="divide-y divide-ink-100">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: serviceColor(s.prefix) }}
                >
                  {s.prefix}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800">{s.name}</p>
                  <p className="text-xs text-ink-400">{s.waiting_count ?? 0} waiting · next #{s.next_number}</p>
                </div>
                <span className={`badge ${s.is_active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                  {s.is_active ? 'Open' : 'Closed'}
                </span>
              </div>
            ))}
          </Card>
        </section>

        {/* Recent tokens */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Recent tokens</h2>
            <button onClick={() => navigate({ name: 'admin-tokens' })} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Manage <ArrowRight size={14} />
            </button>
          </div>
          {tokens.length === 0 ? (
            <EmptyState icon={<ClipboardList size={26} />} title="No tokens yet" />
          ) : (
            <Card className="divide-y divide-ink-100">
              {tokens.slice(0, 6).map((t) => {
                const meta = TOKEN_STATUS_META[t.status];
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="font-mono text-sm font-bold text-ink-800">
                      {t.service ? formatTokenNumber(t.service, t.number) : `#${t.number}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-700">
                        {t.profile?.full_name || `@${t.profile?.username ?? 'user'}`}
                      </p>
                      <p className="text-xs text-ink-400">{formatDate(t.created_at)} · {t.service?.name}</p>
                    </div>
                    <span className={`badge ${meta.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
