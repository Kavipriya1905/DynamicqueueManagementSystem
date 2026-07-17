import { useEffect, useState } from 'react';
import { Layers, Plus, Pencil, Trash2, Power, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchServices, createService, updateService, deleteService } from '../../lib/api';
import type { ServiceWithCounts } from '../../lib/types';
import { Card, SectionHeader, EmptyState, Button, Modal, Input, Textarea, ConfirmDialog, Toast } from '../../components/ui';
import { serviceColor } from '../../components/QueueCards';

interface FormState {
  name: string;
  description: string;
  prefix: string;
  estimated_wait_minutes: number;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: '',
  description: '',
  prefix: 'A',
  estimated_wait_minutes: 5,
  is_active: true,
};

export function AdminServicesPage() {
  const [services, setServices] = useState<ServiceWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceWithCounts | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    const data = await fetchServices();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (s: ServiceWithCounts) => {
    setForm({
      name: s.name,
      description: s.description ?? '',
      prefix: s.prefix,
      estimated_wait_minutes: s.estimated_wait_minutes,
      is_active: s.is_active,
    });
    setEditing(s);
    setCreating(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setToast('Service name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateService(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          prefix: form.prefix.trim() || 'A',
          estimated_wait_minutes: form.estimated_wait_minutes,
          is_active: form.is_active,
        });
        setToast(`Updated "${form.name}".`);
      } else {
        await createService({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          prefix: form.prefix.trim() || 'A',
          estimated_wait_minutes: form.estimated_wait_minutes,
        });
        setToast(`Created "${form.name}".`);
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: ServiceWithCounts) => {
    try {
      await updateService(s.id, { is_active: !s.is_active });
      setToast(`${s.name} is now ${!s.is_active ? 'open' : 'closed'}.`);
      await load();
    } catch {
      setToast('Could not update service.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteService(deleteTarget.id);
      setToast(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      await load();
    } catch {
      setToast('Could not delete service.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <SectionHeader
        icon={<Layers size={20} />}
        title="Service Management"
        subtitle="Create, edit, and toggle queue services."
        action={<Button onClick={openCreate} icon={<Plus size={16} />}>New service</Button>}
      />

      {loading ? (
        <div className="grid-cards">
          {[0, 1, 2].map((i) => <Card key={i} className="h-44 skeleton" />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<Layers size={26} />}
          title="No services yet"
          description="Create your first queue service to get started."
          action={<Button onClick={openCreate} icon={<Plus size={16} />}>New service</Button>}
        />
      ) : (
        <div className="grid-cards">
          {services.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
                    style={{ backgroundColor: serviceColor(s.prefix) }}
                  >
                    {s.prefix}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-400">{s.waiting_count ?? 0} waiting · ~{s.estimated_wait_minutes}m/person</p>
                  </div>
                </div>
                <span className={`badge ${s.is_active ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.is_active ? 'bg-brand-500' : 'bg-ink-400'}`} />
                  {s.is_active ? 'Open' : 'Closed'}
                </span>
              </div>
              {s.description && <p className="mt-3 line-clamp-2 text-sm text-ink-500">{s.description}</p>}
              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => openEdit(s)} className="btn-secondary flex-1 text-xs">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => toggleActive(s)} className="btn-secondary text-xs" title={s.is_active ? 'Close service' : 'Open service'}>
                  <Power size={14} />
                </button>
                <button onClick={() => setDeleteTarget(s)} className="btn-danger text-xs" title="Delete service">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={editing ? 'Edit service' : 'New service'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Customer Support"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="What this service desk handles…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Token prefix"
              placeholder="A"
              value={form.prefix}
              maxLength={2}
              onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
              hint="Letter shown on tokens, e.g. A → A-001"
            />
            <Input
              label="Est. minutes / person"
              type="number"
              min={0}
              value={form.estimated_wait_minutes}
              onChange={(e) => setForm((f) => ({ ...f, estimated_wait_minutes: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
          {editing && (
            <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-ink-700">Service is open for bookings</span>
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
          <Button onClick={save} loading={saving} icon={!saving && <Save size={16} />}>
            {editing ? 'Save changes' : 'Create service'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete service?"
        message={`"${deleteTarget?.name}" and all of its tokens will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
