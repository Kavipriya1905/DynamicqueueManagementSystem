import { useState } from 'react';
import { UserCircle, Shield, LogOut, KeyRound, BadgeCheck, AtSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { supabase } from '../lib/supabase';
import { Card, SectionHeader, Button, Toast } from '../components/ui';
import { RoleBadge } from '../components/AppShell';
import { formatDate } from '../lib/types';

export function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast('');
    if (newPassword.length < 6) { setToast('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setToast('New passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setToast('Password updated successfully.');
      setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<UserCircle size={20} />}
        title="Profile"
        subtitle="Your account details and settings."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {(profile?.username ?? '?')[0]?.toUpperCase()}
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink-900">
              {profile?.full_name || profile?.username}
            </h2>
            <p className="text-sm text-ink-400">@{profile?.username}</p>
            <div className="mt-3">
              <RoleBadge role={profile?.role ?? 'user'} />
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-ink-100 pt-4 text-sm">
            <Row icon={<AtSign size={15} />} label="Username" value={profile?.username ?? '—'} />
            <Row icon={<BadgeCheck size={15} />} label="Full name" value={profile?.full_name ?? '—'} />
            <Row icon={<Shield size={15} />} label="Role" value={profile?.role ?? 'user'} />
            <Row icon={<UserCircle size={15} />} label="Joined" value={profile ? formatDate(profile.created_at) : '—'} />
          </div>
          <button
            onClick={() => { signOut(); navigate({ name: 'login' }); }}
            className="btn-danger mt-6 w-full"
          >
            <LogOut size={16} /> Sign out
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => { refreshProfile(); navigate({ name: 'admin' }); }}
              className="btn-secondary mt-2 w-full"
            >
              <Shield size={16} /> Open admin console
            </button>
          )}
        </Card>

        {/* Change password */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <KeyRound size={18} className="text-brand-600" /> Change password
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Choose a strong password of at least 6 characters.
          </p>
          <form onSubmit={changePassword} className="mt-5 max-w-md space-y-4">
            <label className="block">
              <span className="label">New password</span>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="block">
              <span className="label">Confirm new password</span>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <Button type="submit" loading={saving} icon={!saving && <KeyRound size={16} />}>
              {saving ? 'Updating…' : 'Update password'}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
            <p className="font-semibold text-ink-700">Account ID</p>
            <p className="mt-1 break-all font-mono text-xs text-ink-500">{user?.id}</p>
          </div>
        </Card>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-500">
        {icon} {label}
      </span>
      <span className="font-semibold text-ink-800">{value}</span>
    </div>
  );
}
