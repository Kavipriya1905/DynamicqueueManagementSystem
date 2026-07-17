import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, Search, PhoneCall, Check, XCircle, UserX, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  fetchServices, fetchAllTokens, callNextToken, updateTokenStatus,
} from '../../lib/api';
import type { ServiceWithCounts, TokenWithRelations, TokenStatus } from '../../lib/types';
import { formatTokenNumber, TOKEN_STATUS_META, formatTime, formatDate } from '../../lib/types';
import {
  Card, SectionHeader, Input, EmptyState, Button, Toast, ConfirmDialog,
} from '../../components/ui';
import { serviceColor } from '../../components/QueueCards';

type StatusFilter = 'all' | 'waiting' | 'serving' | 'completed' | 'cancelled' | 'no_show';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'serving', label: 'Serving' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function AdminTokensPage() {
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [tokens, setTokens] = useState<TokenWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('waiting');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [calling, setCalling] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; action: TokenStatus; label: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    const [s, t] = await Promise.all([fetchServices(), fetchAllTokens()]);
    setServices(s);
    setTokens(t);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-tokens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    let list = tokens;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (serviceFilter !== 'all') list = list.filter((t) => t.service_id === serviceFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          String(t.number).includes(q) ||
          (t.profile?.username ?? '').toLowerCase().includes(q) ||
          (t.profile?.full_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [tokens, statusFilter, serviceFilter, query]);

  const handleCallNext = async (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    setCalling(serviceId);
    try {
      const next = await callNextToken(serviceId);
      if (next) {
        setToast(`Called ${svc ? formatTokenNumber(svc, next.number) : 'next token'}.`);
      } else {
        setToast('No waiting tokens for that service.');
      }
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not call next token.');
    } finally {
      setCalling(null);
    }
  };

  const runStatusAction = async () => {
    if (!confirm) return;
    setConfirming(true);
    setBusyId(confirm.id);
    try {
      await updateTokenStatus(confirm.id, confirm.action);
      setToast(`Token marked as ${confirm.label.toLowerCase()}.`);
      setConfirm(null);
      await load();
    } catch {
      setToast('Could not update token.');
    } finally {
      setConfirming(false);
      setBusyId(null);
    }
  };

  const ask = (id: string, action: TokenStatus, label: string) =>
    setConfirm({ id, action, label });

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<ClipboardList size={20} />}
        title="Token Management"
        subtitle="Call the next token and manage queue state."
      />

      {/* Call-next bar */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Call next token</p>
        <div className="grid-cards">
          {services.map((s) => (
            <Card key={s.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: serviceColor(s.prefix) }}
                >
                  {s.prefix}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-400">{s.waiting_count ?? 0} waiting · now {s.serving_token ? formatTokenNumber(s, s.serving_token.number) : '—'}</p>
                </div>
              </div>
              <Button
                variant="accent"
                onClick={() => handleCallNext(s.id)}
                loading={calling === s.id}
                icon={!calling && <PhoneCall size={15} />}
                className="!px-3 !py-2"
              >
                Call next
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <Input
            icon={<Search size={16} />}
            placeholder="Search by number or user…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="input lg:w-56"
        >
          <option value="all">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-ink-200 bg-white p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              statusFilter === f.key ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="h-64 skeleton" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} />}
          title="No tokens match"
          description="Try a different filter or status."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 sm:grid">
            <div className="col-span-2">Token</div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Service</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          <div className="divide-y divide-ink-100">
            {filtered.slice(0, 100).map((t) => {
              const meta = TOKEN_STATUS_META[t.status];
              const svc = t.service;
              return (
                <div key={t.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5">
                  <div className="col-span-12 sm:col-span-2">
                    <p className="font-mono text-sm font-bold text-ink-900">
                      {svc ? formatTokenNumber(svc, t.number) : `#${t.number}`}
                    </p>
                    <p className="text-xs text-ink-400">{formatDate(t.created_at)}</p>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <p className="truncate text-sm font-semibold text-ink-800">
                      {t.profile?.full_name || `@${t.profile?.username ?? 'user'}`}
                    </p>
                    <p className="text-xs text-ink-400">Booked {formatTime(t.booked_at)}</p>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <span className="text-sm font-medium text-ink-700">{svc?.name ?? '—'}</span>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <span className={`badge ${meta.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                    </span>
                  </div>
                  <div className="col-span-6 flex flex-wrap justify-end gap-1.5 sm:col-span-3">
                    {t.status === 'serving' && (
                      <>
                        <button
                          onClick={() => ask(t.id, 'completed', 'Completed')}
                          disabled={busyId === t.id}
                          className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                        >
                          <Check size={13} /> Complete
                        </button>
                        <button
                          onClick={() => ask(t.id, 'no_show', 'No show')}
                          disabled={busyId === t.id}
                          className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                        >
                          <UserX size={13} /> No show
                        </button>
                      </>
                    )}
                    {t.status === 'waiting' && (
                      <>
                        <button
                          onClick={() => ask(t.id, 'serving', 'Now serving')}
                          disabled={busyId === t.id}
                          className="btn btn-primary !px-2.5 !py-1.5 text-xs"
                        >
                          <PhoneCall size={13} /> Call
                        </button>
                        <button
                          onClick={() => ask(t.id, 'cancelled', 'Cancelled')}
                          disabled={busyId === t.id}
                          className="btn btn-danger !px-2.5 !py-1.5 text-xs"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      </>
                    )}
                    {(t.status === 'completed' || t.status === 'cancelled' || t.status === 'no_show') && (
                      <button
                        onClick={() => ask(t.id, 'waiting', 'Waiting')}
                        disabled={busyId === t.id}
                        className="btn btn-secondary !px-2.5 !py-1.5 text-xs"
                      >
                        <RotateCcw size={13} /> Re-queue
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runStatusAction}
        title={`Mark token as ${confirm?.label}?`}
        message="This will update the token's status in the queue."
        confirmLabel={confirm?.label ?? 'Confirm'}
        loading={confirming}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
