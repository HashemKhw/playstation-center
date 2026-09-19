import { formatDurationCompact, formatJod } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import type { ReportDto } from '../lib/types';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function ReportsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ReportDto | null>(null);
  const [productSort, setProductSort] = useState<'quantity' | 'revenue'>('revenue');

  async function load() {
    const params = new URLSearchParams({ period });
    if (period === 'custom') {
      params.set('from', from);
      params.set('to', to);
    }
    setReport(await api<ReportDto>(`/api/reports?${params}`));
  }

  useEffect(() => {
    if (period === 'custom') return;
    void load().catch((error: unknown) =>
      toast.push(error instanceof Error ? error.message : 'Could not load report', 'err'),
    );
  }, [period, toast]);

  const products = [...(report?.products ?? [])].sort((a, b) =>
    productSort === 'quantity' ? b.quantity - a.quantity : b.revenueFils - a.revenueFils,
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-semibold text-content">Performance overview</h2>
        <p className="text-sm text-content-muted">Paid revenue and operating performance</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {(['today', 'yesterday', 'week', 'month', 'custom'] as Period[]).map((value) => (
          <Button
            key={value}
            variant={period === value ? 'primary' : 'secondary'}
            onClick={() => setPeriod(value)}
          >
            {value === 'week' ? 'This week' : value === 'month' ? 'This month' : title(value)}
          </Button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="nexus-panel flex flex-wrap items-end gap-2 p-3">
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} />
          <Button disabled={!from || !to} onClick={() => void load()}>
            Apply
          </Button>
        </div>
      )}
      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Metric icon="wallet" label="Total revenue" value={formatJod(report.totalRevenueFils)} accent />
            <Metric icon="gamepad" label="Gaming" value={formatJod(report.gamingRevenueFils)} />
            <Metric icon="food" label="Extras" value={formatJod(report.extrasRevenueFils)} />
            <Metric icon="sessions" label="Sessions" value={String(report.sessionCount)} />
            <Metric icon="timer" label="Gaming time" value={formatDurationCompact(report.totalGamingSeconds)} />
            <Metric icon="calendar" label="Average session" value={formatDurationCompact(report.averageSessionSeconds)} />
            <Metric icon="transactions" label="Average sale" value={formatJod(report.averageTransactionFils)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <section className="nexus-panel overflow-hidden">
            <h3 className="border-b border-outline-variant p-4 text-lg font-semibold">Screen performance</h3>
            <div className="overflow-x-auto">
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th className="p-3">Screen</th>
                    <th className="p-3">Sessions</th>
                    <th className="p-3">Gaming time</th>
                    <th className="p-3">Revenue</th>
                    <th className="p-3">Average/session</th>
                  </tr>
                </thead>
                <tbody>
                  {report.screens.map((row) => (
                    <tr key={row.screenId} className="bg-surface hover:bg-surface-high">
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3">{row.sessions}</td>
                      <td className="p-3">{formatDurationCompact(row.seconds)}</td>
                      <td className="p-3 font-mono text-primary">{formatJod(row.revenueFils)}</td>
                      <td className="p-3 font-mono">{formatJod(row.averageRevenueFils)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="nexus-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant p-4">
              <h3 className="text-lg font-semibold">Top extras</h3>
              <select
                className="rounded-lg border border-outline-variant bg-surface-high px-2 py-1 text-sm"
                value={productSort}
                onChange={(event) => setProductSort(event.target.value as typeof productSort)}
              >
                <option value="revenue">Sort by revenue</option>
                <option value="quantity">Sort by quantity</option>
              </select>
            </div>
            <div className="space-y-1 p-4">
              {products.length === 0 && <p className="text-sm text-content-muted">No product sales in this period.</p>}
              {products.map((product) => (
                <div key={product.name} className="flex justify-between border-b border-outline-variant py-3 text-sm last:border-0">
                  <span>{product.name}</span>
                  <span className="font-mono">
                    {product.quantity} sold · {formatJod(product.revenueFils)}
                  </span>
                </div>
              ))}
            </div>
          </section>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: IconName;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="nexus-panel flex min-h-28 flex-col justify-between p-4">
      <div className="flex justify-between text-content-muted">
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
        <Icon className={accent ? 'text-primary' : ''} name={icon} size={18} />
      </div>
      <p className={`mt-2 font-mono text-lg font-semibold ${accent ? 'text-primary' : 'text-content'}`}>{value}</p>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="nexus-label">{label}</span>
      <input
        type="date"
        className="nexus-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function title(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
