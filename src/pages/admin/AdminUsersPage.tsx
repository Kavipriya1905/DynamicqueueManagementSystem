import { useEffect, useMemo, useState } from 'react';
import { Users, Search, Shield, UserCircle } from 'lucide-react';
import { fetchProfiles, updateProfileRole } from '../../lib/api';
import type { Profile } from '../../lib/types';
import { formatDate } from '../../lib/types';
import { Card, SectionHeader, Input, EmptyState, Toast, ConfirmDialog } from '../../components/ui';
import { RoleBadge } from '../../components/AppShell';

export function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [promoteTarget, setPromoteTarget] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    const data = await fetchProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = profiles;
    if (roleFilter !== 'all') list = list.filter((p) => p.role === roleFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) => p.username.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [profiles, query, roleFilter]);

  const toggleRole = async (p: Profile) => {
    setBusy(true);
    try {
      const newRole = p.role === 'admin' ? 'user' : 'admin';
      await updateProfileRole(p.id, newRole);
      setToast(`${p.username} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}.`);
      setPromoteTarget(null);
      await load();
    } catch {
      setToast('Could not update role.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<Users size={20} />}
        title="User Management"
        subtitle="View users and manage admin access."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            icon={<Search size={16} />}
            placeholder="Search by username or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 rounded-xl border border-ink-200 bg-white p-1">
          {(['all', 'user', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                roleFilter === r ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {r === 'all' ? 'All' : r === 'admin' ? 'Admins' : 'Users'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="h-64 skeleton" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="No users found" description="Try a different search or filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 sm:grid">
            <div className="col-span-5">User</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-ink-100">
            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5">
                <div className="col-span-12 flex items-center gap-3 sm:col-span-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {(p.username[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.full_name || p.username}</p>
                    <p className="truncate text-xs text-ink-400">@{p.username}</p>
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <RoleBadge role={p.role} />
                  {p.role !== 'admin' && (
                    <span className="badge bg-ink-100 text-ink-600"><UserCircle size={12} /> User</span>
                  )}
                </div>
                <div className="col-span-3 text-xs text-ink-500 sm:col-span-2">{formatDate(p.created_at)}</div>
                <div className="col-span-3 flex justify-end sm:col-span-2">
                  <button
                    onClick={() => setPromoteTarget(p)}
                    className={`btn text-xs ${p.role === 'admin' ? 'btn-danger' : 'btn-secondary'}`}
                  >
                    <Shield size={14} />
                    {p.role === 'admin' ? 'Demote' : 'Promote'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onConfirm={() => promoteTarget && toggleRole(promoteTarget)}
        title={promoteTarget?.role === 'admin' ? 'Demote to user?' : 'Promote to admin?'}
        message={
          promoteTarget?.role === 'admin'
            ? `${promoteTarget.username} will lose admin access and become a regular user.`
            : `${promoteTarget?.username} will gain full admin access to manage services, users, and tokens.`
        }
        confirmLabel={promoteTarget?.role === 'admin' ? 'Demote' : 'Promote'}
        danger={promoteTarget?.role === 'admin'}
        loading={busy}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
