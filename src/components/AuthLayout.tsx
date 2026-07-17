import { type ReactNode } from 'react';
import { Ticket, Radio, CalendarCheck, Shield } from 'lucide-react';

export function AuthLayout({
  children,
  title,
  subtitle,
  footer,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 px-12 py-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow">
            <Ticket size={22} />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-white">QueueFlow</p>
            <p className="text-xs font-medium text-ink-400">Smart queue management</p>
          </div>
        </div>

        <div className="relative z-10 px-12">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white text-balance">
            Skip the wait. Book your token and track the queue in real time.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
            Reserve your place in line from anywhere. Watch live status, get called faster,
            and reclaim your time — no app install required.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <Feature icon={<Radio size={18} />} title="Live queue" desc="Real-time updates" />
            <Feature icon={<CalendarCheck size={18} />} title="Book ahead" desc="Pick a service" />
            <Feature icon={<Shield size={18} />} title="Secure" desc="Password protected" />
            <Feature icon={<Ticket size={18} />} title="Smart tokens" desc="Never lose your spot" />
          </div>
        </div>

        <div className="relative z-10 px-12 py-10 text-xs text-ink-500">
          © {new Date().getFullYear()} QueueFlow. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                <Ticket size={20} />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink-900">QueueFlow</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
        {icon}
      </span>
      <p className="mt-3 text-sm font-bold text-white">{title}</p>
      <p className="text-xs text-ink-400">{desc}</p>
    </div>
  );
}
