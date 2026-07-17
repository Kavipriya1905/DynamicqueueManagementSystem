import { useState } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Input } from '../components/ui';

export function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(username, password);
      navigate({ name: 'dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your queue tokens."
      footer={
        <>
          New here?{' '}
          <button
            onClick={() => navigate({ name: 'register' })}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Create an account
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Username"
          icon={<User size={16} />}
          placeholder="e.g. admin or your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <Input
          label="Password"
          icon={<Lock size={16} />}
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full" icon={!loading && <ArrowRight size={16} />}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-xs text-ink-500">
        <p className="font-semibold text-ink-700">Demo admin account</p>
        <p className="mt-1">
          username: <code className="font-mono text-ink-800">admin</code> · password:{' '}
          <code className="font-mono text-ink-800">admin123</code>
        </p>
      </div>
    </AuthLayout>
  );
}
