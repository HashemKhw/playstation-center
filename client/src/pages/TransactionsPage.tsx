import { formatDurationCompact, formatJod } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import type { ScreenDto, SessionDto } from '../lib/types';

export function TransactionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<SessionDto[]>([]);
  const [screens, setScreens] = useState<ScreenDto[]>([]);
  const [search, setSearch] = useState('');
  const [screenId, setScreenId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (screenId) params.set('screenId', screenId);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    if (status) params.set('status', status);
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (to) {
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      params.set('to', end.toISOString());
    }
    const result = await api<{ transactions: SessionDto[] }>(`/api/transactions?${params}`);
    setItems(result.transactions);
  }

  useEffect(() => {
    void Promise.all([load(), api<{ screens: ScreenDto[] }>('/api/screens').then((result) => setScreens(result.screens))]).catch(
      (error: unknown) => toast.push(error instanceof Error ? error.message : 'Could not load history', 'err'),
    );
  }, [toast]);

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-semibold text-content">Transaction history</h2>
        <p className="text-sm text-content-muted">Completed and pending-checkout sessions</p>
      </header>
      <div className="nexus-panel grid gap-2 p-4 md:grid-cols-4">
        <input
          className="nexus-input text-sm"
          placeholder="Search note, screen, ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="nexus-input text-sm"
          value={screenId}
          onChange={(event) => setScreenId(event.target.value)}
        >
          <option value="">All screens</option>
          {screens.map((screen) => (
            <option key={screen.id} value={screen.id}>
              {screen.name}
            </option>
          ))}
        </select>
        <select
          className="nexus-input text-sm"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          <option value="">All payment methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          className="nexus-input text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Paid + checkout</option>
          <option value="COMPLETED">Paid</option>
          <option value="CHECKOUT">Awaiting payment</option>
        </select>
        <input
          type="date"
          className="nexus-input text-sm"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          type="date"
          className="nexus-input text-sm"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Button onClick={() => void load()}>Apply filters</Button>
        <div className="flex flex-wrap gap-1 md:col-span-4">
          {(['today', 'yesterday', 'week', 'month'] as const).map((period) => (
            <Button
              key={period}
              variant="ghost"
              onClick={() => {
                const range = presetRange(period);
                setFrom(range.from);
                setTo(range.to);
              }}
            >
              {period === 'week' ? 'This week' : period === 'month' ? 'This month' : capitalize(period)}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
        <table className="nexus-table">
          <thead>
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Screen</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Gaming</th>
              <th className="p-3">Extras</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Method</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="bg-surface transition-colors hover:bg-surface-high">
                <td className="p-3">
                  <Link className="text-primary hover:underline" to={`/transactions/${item.id}`}>
                    {new Date(item.closedAt ?? item.startTime).toLocaleString()}
                  </Link>
                </td>
                <td className="p-3">{item.screenName}</td>
                <td className="p-3">{formatDurationCompact(item.actualDurationSeconds)}</td>
                <td className="p-3 font-mono">{formatJod(item.gamingCostFils)}</td>
                <td className="p-3 font-mono">{formatJod(item.extrasCostFils)}</td>
                <td className="p-3 font-mono font-semibold text-primary">{formatJod(item.totalFils)}</td>
                <td className="p-3">
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-bold tracking-wider text-primary">
                    {item.paymentStatus}
                  </span>
                </td>
                <td className="p-3">{item.paymentMethod ?? '—'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr className="bg-surface">
                <td className="p-5 text-center text-content-muted" colSpan={8}>
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type TransactionDetail = SessionDto & {
  payments?: { amountFils: number; changeFils: number; paymentMethod: string; createdAt: string }[];
  events?: { id: string; type: string; createdAt: string }[];
};

export function TransactionDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [item, setItem] = useState<TransactionDetail | null>(null);

  useEffect(() => {
    void api<{ transaction: TransactionDetail }>(`/api/transactions/${id}`)
      .then((result) => setItem(result.transaction))
      .catch((error: unknown) =>
        toast.push(error instanceof Error ? error.message : 'Could not load transaction', 'err'),
      );
  }, [id, toast]);

  if (!item) return <p className="text-content-muted">Loading transaction…</p>;
  const payment = item.payments?.[0];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Link className="text-sm text-primary" to="/transactions">
          ← Transaction history
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {item.screenName} · {item.id.slice(-8)}
        </h1>
      </header>
      <section className="nexus-panel p-5 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>Start: {new Date(item.startTime).toLocaleString()}</p>
          <p>End: {item.endTime ? new Date(item.endTime).toLocaleString() : '—'}</p>
          <p>Duration: {formatDurationCompact(item.actualDurationSeconds)}</p>
          <p>Pricing: {item.pricingRuleName} · {item.billingMethod.replaceAll('_', ' ')}</p>
          <p>Notes: {item.notes || '—'}</p>
          <p>Payment: {item.paymentStatus}</p>
        </div>
        <div className="mt-5 space-y-2 border-t border-outline-variant pt-4">
          <Line label="Gaming" value={formatJod(item.gamingCostFils)} />
          {item.extras.map((extra) => (
            <Line key={extra.id} label={`${extra.name} × ${extra.quantity}`} value={formatJod(extra.totalFils)} />
          ))}
          <Line label="Extras total" value={formatJod(item.extrasCostFils)} />
          <Line label="Discount" value={formatJod(item.discountFils)} />
          <Line label="TOTAL" value={formatJod(item.totalFils)} strong />
          {payment && (
            <>
              <Line label={`Paid (${payment.paymentMethod})`} value={formatJod(payment.amountFils)} />
              <Line label="Change" value={formatJod(payment.changeFils)} />
            </>
          )}
        </div>
      </section>
      <section className="nexus-panel p-5">
        <h2 className="mb-3 font-semibold">Activity log</h2>
        <div className="space-y-2 text-sm">
          {item.events?.map((event) => (
            <div key={event.id} className="flex justify-between border-b border-outline-variant pb-2">
              <span>{event.type.replaceAll('_', ' ')}</span>
              <span className="text-content-muted">{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-outline-variant pt-2 text-lg font-bold' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function presetRange(period: 'today' | 'yesterday' | 'week' | 'month') {
  const end = new Date();
  const start = new Date(end);
  if (period === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (period === 'week') {
    const weekday = start.getDay();
    start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  } else if (period === 'month') {
    start.setDate(1);
  }
  return { from: localDate(start), to: localDate(end) };
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
