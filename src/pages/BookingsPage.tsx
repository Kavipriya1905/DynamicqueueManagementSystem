import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchMyTokens, updateTokenStatus } from '../lib/api';
import type { TokenWithRelations } from '../lib/types';
import { Card, SectionHeader, EmptyState, Toast, ConfirmDialog } from '../components/ui';
import { TokenCard } from '../components/QueueCards';
import { useRouter } from '../context/RouterContext';

type Filter = 'active' | 'waiting' | 'serving' | 'history';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'serving', label: 'Serving' },
  { key: 'history', label: 'History' },
];

export function BookingsPage() {
  const { navigate } = useRouter();
  const [tokens, setTokens] = useState<TokenWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [cancelTarget, setCancelTarget] = useState<TokenWithRelations | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    const data = await fetchMyTokens();
    setTokens(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('my-tokens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return tokens.filter((t) => t.status === 'waiting' || t.status === 'serving');
      case 'waiting':
        return tokens.filter((t) => t.status === 'waiting');
      case 'serving':
        return tokens.filter((t) => t.status === 'serving');
      case 'history':
        return tokens.filter((t) => ['completed', 'cancelled', 'no_show'].includes(t.status));
    }
  }, [tokens, filter]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    try {
      await updateTokenStatus(cancelTarget.id, 'cancelled');
      setToast('Token cancelled.');
      setCancelTarget(null);
      await load();
    } catch {
      setToast('Could not cancel token.');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<CalendarCheck size={20} />}
        title="My Bookings"
        subtitle="All your queue tokens in one place."
        action={
          <button onClick={() => navigate({ name: 'services' })} className="btn-primary">
            Book new token
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-ink-200 bg-white p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.key ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {f.key === 'active' && <Filter size={14} />}
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid-cards">
          {[0, 1].map((i) => <Card key={i} className="h-48 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={26} />}
          title={filter === 'history' ? 'No history yet' : 'No active bookings'}
          description={filter === 'history' ? 'Your past tokens will show up here.' : 'Book a token to join a queue.'}
          action={<button onClick={() => navigate({ name: 'services' })} className="btn-primary">Browse services</button>}
        />
      ) : (
        <div className="grid-cards">
          {filtered.map((t) => (
            <TokenCard
              key={t.id}
              token={t}
              onCancel={(id) => setCancelTarget(filtered.find((x) => x.id === id) ?? null)}
              canceling={canceling && cancelTarget?.id === t.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel this token?"
        message="You will lose your place in the queue. This cannot be undone."
        confirmLabel="Yes, cancel"
        danger
        loading={canceling}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
