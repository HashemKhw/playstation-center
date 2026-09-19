import { formatJod, parseJodToFils } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import type { PricingRuleDto } from '../lib/types';

type BillingMethod = 'PER_MINUTE' | 'PER_STARTED_HOUR' | 'FIXED_BLOCKS';
type Block = { durationSeconds: number; priceFils: number };

export function PricingPage() {
  const toast = useToast();
  const [rules, setRules] = useState<PricingRuleDto[]>([]);
  const [editing, setEditing] = useState<PricingRuleDto | null | 'new'>(null);

  async function load() {
    const result = await api<{ pricingRules: PricingRuleDto[] }>('/api/pricing');
    setRules(result.pricingRules);
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      toast.push(error instanceof Error ? error.message : 'Could not load pricing', 'err'),
    );
  }, [toast]);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-content">Pricing rules</h2>
          <p className="text-sm text-content-muted">Reusable billing rules assigned to screens</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" /> Add pricing rule
        </Button>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rules.map((rule) => (
          <article key={rule.id} className="nexus-panel p-4 transition hover:border-outline">
            <div className="flex justify-between">
              <h2 className="font-semibold">{rule.name}</h2>
              <span className="rounded-full border border-outline-variant bg-surface-high px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                {rule.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-3 font-mono text-lg">{formatJod(rule.hourlyRateFils)}/hour</p>
            <p className="text-xs text-content-muted">{rule.billingMethod.replaceAll('_', ' ')}</p>
            <Button className="mt-4" variant="secondary" onClick={() => setEditing(rule)}>
              <Icon name="edit" size={16} /> Edit
            </Button>
          </article>
        ))}
      </div>
      {editing && (
        <PricingForm
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            toast.push('Pricing rule saved');
          }}
        />
      )}
    </div>
  );
}

function PricingForm({
  rule,
  onClose,
  onSaved,
}: {
  rule: PricingRuleDto | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const existingBlocks = parseBlocks(rule?.blocksJson ?? '[]');
  const [name, setName] = useState(rule?.name ?? '');
  const [method, setMethod] = useState<BillingMethod>(
    (rule?.billingMethod as BillingMethod | undefined) ?? 'PER_MINUTE',
  );
  const [rate, setRate] = useState(rule ? formatJod(rule.hourlyRateFils, { withUnit: false }) : '2.00');
  const [active, setActive] = useState(rule?.active ?? true);
  const [blocks, setBlocks] = useState(
    existingBlocks.length
      ? existingBlocks
          .map((block) => `${block.durationSeconds / 60}=${formatJod(block.priceFils, { withUnit: false })}`)
          .join('\n')
      : '30=1.00\n60=2.00\n120=3.50',
  );

  async function save() {
    try {
      const parsedBlocks =
        method === 'FIXED_BLOCKS'
          ? blocks
              .split(/\r?\n/)
              .filter(Boolean)
              .map((line) => {
                const [minutes, price] = line.split('=');
                if (!minutes || !price || Number(minutes) <= 0) throw new Error('Invalid block');
                return {
                  durationSeconds: Number(minutes) * 60,
                  priceFils: parseJodToFils(price),
                };
              })
          : [];
      await api(rule ? `/api/pricing/${rule.id}` : '/api/pricing', {
        method: rule ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name,
          billingMethod: method,
          hourlyRateFils: parseJodToFils(rate),
          blocks: parsedBlocks,
          active,
        }),
      });
      await onSaved();
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Check the pricing values', 'err');
    }
  }

  return (
    <Modal title={rule ? `Edit ${rule.name}` : 'Add pricing rule'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">
          Name
          <input
            className="nexus-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          Billing method
          <select
            className="nexus-input"
            value={method}
            onChange={(event) => setMethod(event.target.value as BillingMethod)}
          >
            <option value="PER_MINUTE">Per minute</option>
            <option value="PER_STARTED_HOUR">Per started hour</option>
            <option value="FIXED_BLOCKS">Fixed blocks</option>
          </select>
        </label>
        <label className="block">
          Hourly rate (JD)
          <input
            className="nexus-input font-mono"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </label>
        {method === 'FIXED_BLOCKS' && (
          <label className="block">
            Blocks — one per line: minutes=JD
            <textarea
              className="nexus-input h-28 font-mono"
              value={blocks}
              onChange={(event) => setBlocks(event.target.value)}
            />
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function parseBlocks(json: string): Block[] {
  try {
    const result = JSON.parse(json) as Block[];
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}
