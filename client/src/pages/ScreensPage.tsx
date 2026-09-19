import { formatJod } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import type { PricingRuleDto, ScreenDto } from '../lib/types';

export function ScreensPage() {
  const toast = useToast();
  const [screens, setScreens] = useState<ScreenDto[]>([]);
  const [rules, setRules] = useState<PricingRuleDto[]>([]);
  const [editing, setEditing] = useState<ScreenDto | null | 'new'>(null);

  async function load() {
    const [screenResult, pricingResult] = await Promise.all([
      api<{ screens: ScreenDto[] }>('/api/screens'),
      api<{ pricingRules: PricingRuleDto[] }>('/api/pricing'),
    ]);
    setScreens(screenResult.screens);
    setRules(pricingResult.pricingRules);
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      toast.push(error instanceof Error ? error.message : 'Could not load screens', 'err'),
    );
  }, [toast]);

  async function remove(screen: ScreenDto) {
    if (!window.confirm(`Delete ${screen.name}? Screens with history cannot be deleted.`)) return;
    try {
      await api(`/api/screens/${screen.id}`, { method: 'DELETE' });
      await load();
      toast.push('Screen deleted');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not delete screen', 'err');
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-content">Screen management</h2>
          <p className="text-sm text-content-muted">Stations, console types, status, and assigned pricing</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" /> Add screen
        </Button>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {screens.map((screen) => (
          <article key={screen.id} className="nexus-panel p-4 transition hover:border-outline">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{screen.name}</h2>
                <p className="text-sm text-content-muted">{screen.consoleType}</p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface-high px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                {screen.maintenance ? 'Maintenance' : screen.active ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="mt-3 font-mono text-sm">
              {formatJod(screen.pricingRule.hourlyRateFils)}/hour
            </p>
            <p className="text-xs text-content-muted">{screen.pricingRule.name}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(screen)}>
                <Icon name="edit" size={16} /> Edit
              </Button>
              <Button variant="ghost" onClick={() => void remove(screen)}>
                <Icon name="trash" size={16} /> Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <ScreenForm
          screen={editing === 'new' ? null : editing}
          rules={rules}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            toast.push('Screen saved');
          }}
        />
      )}
    </div>
  );
}

function ScreenForm({
  screen,
  rules,
  onClose,
  onSaved,
}: {
  screen: ScreenDto | null;
  rules: PricingRuleDto[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [name, setName] = useState(screen?.name ?? '');
  const [consoleType, setConsoleType] = useState(screen?.consoleType ?? 'PS5');
  const [pricingRuleId, setPricingRuleId] = useState(screen?.pricingRuleId ?? rules[0]?.id ?? '');
  const [active, setActive] = useState(screen?.active ?? true);
  const [maintenance, setMaintenance] = useState(screen?.maintenance ?? false);

  async function save() {
    try {
      await api(screen ? `/api/screens/${screen.id}` : '/api/screens', {
        method: screen ? 'PATCH' : 'POST',
        body: JSON.stringify({ name, consoleType, pricingRuleId, active, maintenance }),
      });
      await onSaved();
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Could not save screen', 'err');
    }
  }

  return (
    <Modal title={screen ? `Edit ${screen.name}` : 'Add screen'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Field label="Screen name" value={name} onChange={setName} />
        <Field label="Console type" value={consoleType} onChange={setConsoleType} />
        <label className="block">
          Pricing
          <select
            className="nexus-input"
            value={pricingRuleId}
            onChange={(event) => setPricingRuleId(event.target.value)}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name} — {formatJod(rule.hourlyRateFils)}/hour
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={maintenance}
            onChange={(event) => setMaintenance(event.target.checked)}
          />
          Maintenance
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || !pricingRuleId} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="nexus-label">{label}</span>
      <input
        className="nexus-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
