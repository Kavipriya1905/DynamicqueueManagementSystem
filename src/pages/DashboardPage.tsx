import { useEffect, useState } from 'react';
import { LayoutDashboard, Ticket, Radio, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { fetchServices, fetchMyTokens, bookToken, updateTokenStatus } from '../lib/api';
import type { ServiceWithCounts, TokenWithRelations, Service } from '../lib/types';
import { Card, SectionHeader, EmptyState, Stat, Toast } from '../components/ui';
import { ServiceCard, TokenCard } from '../components/QueueCards';

export function DashboardPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [tokens, setTokens] = useState<TokenWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    const [s, t] = await Promise.all([fetchServices(), fetchMyTokens()]);
    setServices(s);
    setTokens(t);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeTokens = tokens.filter((t) => t.status === 'waiting' || t.status === 'serving');

  const handleBook = async (s: Service) => {
    setBookingId(s.id);
    try {
      const t = await bookToken(s.id);
      setToast(`Token ${s.prefix}-${String(t.number).padStart(3, '0')} booked for ${s.name}.`);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not book token.');
    } finally {
      setBookingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelingId(id);
    try {
      await updateTokenStatus(id, 'cancelled');
      setToast('Token cancelled.');
      await load();
    } catch {
      setToast('Could not cancel token.');
    } finally {
      setCancelingId(null);
    }
  };

  const totalWaiting = services.reduce((sum, s) => sum + (s.waiting_count ?? 0), 0);
  const openServices = services.filter((s) => s.is_active).length;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<LayoutDashboard size={20} />}
        title={`Welcome, ${profile?.full_name || profile?.username}`}
        subtitle="Your queue at a glance — book a token or jump into the live board."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active tokens" value={activeTokens.length} icon={<Ticket size={18} />} accent="brand" />
        <Stat label="Now serving" value={activeTokens.filter((t) => t.status === 'serving').length} icon={<Radio size={18} />} accent="accent" />
        <Stat label="Open services" value={openServices} icon={<Sparkles size={18} />} />
        <Stat label="People waiting" value={totalWaiting} icon={<Clock size={18} />} />
      </div>

      {activeTokens.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink-900">
            <Ticket size={18} className="text-brand-600" /> Your active tokens
          </h2>
          <div className="grid-cards">
            {activeTokens.map((t) => (
              <TokenCard
                key={t.id}
                token={t}
                onCancel={handleCancel}
                canceling={cancelingId === t.id}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <Sparkles size={18} className="text-brand-600" /> Available services
          </h2>
          <button
            onClick={() => navigate({ name: 'services' })}
            className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            View all <ArrowRight size={15} />
          </button>
        </div>

        {loading ? (
          <div className="grid-cards">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="h-64 skeleton" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} />}
            title="No services yet"
            description="Check back soon — new services appear here when admins add them."
          />
        ) : (
          <div className="grid-cards">
            {services.slice(0, 6).map((s) => (
              <ServiceCard key={s.id} service={s} onBook={handleBook} booking={bookingId === s.id} />
            ))}
          </div>
        )}
      </section>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
