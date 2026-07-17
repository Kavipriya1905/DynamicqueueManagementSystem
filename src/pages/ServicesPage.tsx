import { useEffect, useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { fetchServices, bookToken } from '../lib/api';
import type { ServiceWithCounts, Service } from '../lib/types';
import { Card, SectionHeader, EmptyState, Input, Toast } from '../components/ui';
import { ServiceCard } from '../components/QueueCards';

export function ServicesPage() {
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    const data = await fetchServices();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return services;
    const q = query.toLowerCase();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
    );
  }, [services, query]);

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

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<Layers size={20} />}
        title="Services"
        subtitle="Browse available services and book a queue token instantly."
      />

      <div className="mb-6 max-w-md">
        <Input
          icon={<Search size={16} />}
          placeholder="Search services…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid-cards">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="h-64 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers size={26} />}
          title={query ? 'No matching services' : 'No services yet'}
          description={query ? 'Try a different search term.' : 'Services will appear here once added.'}
        />
      ) : (
        <div className="grid-cards">
          {filtered.map((s) => (
            <ServiceCard key={s.id} service={s} onBook={handleBook} booking={bookingId === s.id} />
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
