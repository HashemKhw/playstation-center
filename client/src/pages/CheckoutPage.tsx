import { computeChangeFils, formatDurationCompact, formatJod, parseJodToFils } from '@pscenter/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import type { SessionDto } from '../lib/types';

type PaymentMethod = { id: string; code: string; name: string; enabled: boolean };

export function CheckoutPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('CASH');
  const [received, setReceived] = useState('');
  const [receipt, setReceipt] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<{ session: SessionDto }>(`/api/sessions/${sessionId}`),
      api<{ settings: Record<string, string>; paymentMethods: PaymentMethod[] }>('/api/settings'),
    ])
      .then(([sessionResult, settingsResult]) => {
        setSession(sessionResult.session);
        setSettings(settingsResult.settings);
        const enabled = settingsResult.paymentMethods.filter((item) => item.enabled);
        setMethods(enabled);
        setMethod(enabled[0]?.code ?? 'CASH');
        setReceived(
          formatJod(
            sessionResult.session.amountReceivedFils ?? sessionResult.session.totalFils,
            { withUnit: false },
          ),
        );
        setReceipt(sessionResult.session.status === 'COMPLETED');
      })
      .catch((error: unknown) =>
        toast.push(error instanceof Error ? error.message : 'Could not load checkout', 'err'),
      );
  }, [sessionId, toast]);

  if (!session) return <p className="text-slate-400">Loading checkout…</p>;

  let receivedFils = 0;
  let validAmount = true;
  try {
    receivedFils = parseJodToFils(received || '0');
  } catch {
    validAmount = false;
  }
  const payment = validAmount
    ? computeChangeFils({ totalFils: session.totalFils, amountReceivedFils: receivedFils })
    : { changeFils: 0, remainingFils: session.totalFils, isPaidInFull: false };

  async function complete() {
    if (!validAmount || !payment.isPaidInFull) return;
    const id = session?.id;
    if (!id) return;
    try {
      const result = await api<{ session: SessionDto }>(`/api/sessions/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amountReceivedFils: receivedFils, paymentMethod: method }),
      });
      setSession(result.session);
      setReceipt(true);
      toast.push('Payment completed');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Payment failed', 'err');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{receipt ? 'Receipt' : 'Checkout'}</h1>
          <p className="text-sm text-slate-400">Session {session.id.slice(-8)}</p>
        </div>
        <Link className="text-sm text-accent" to="/">
          Back to dashboard
        </Link>
      </div>

      <div className={receipt ? '' : 'grid overflow-hidden rounded-xl border border-outline-variant bg-surface md:grid-cols-2'}>
      <section className="receipt-print bg-surface-low p-6 print:border print:border-black print:bg-white print:text-black">
        {receipt && (
          <div className="mb-5 border-b border-dashed border-slate-500 pb-4 text-center">
            <h2 className="text-xl font-bold">
              {(settings.businessName ?? 'PlayStation Center').toUpperCase()}
            </h2>
            <p className="text-sm">{settings.receiptFooter ?? 'Thank you!'}</p>
          </div>
        )}
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Start: {new Date(session.startTime).toLocaleString()}</p>
          <p>End: {session.endTime ? new Date(session.endTime).toLocaleString() : '—'}</p>
          <p>Duration: {formatDurationCompact(session.actualDurationSeconds)}</p>
          <p>Pricing: {session.pricingRuleName}</p>
        </div>
        <div className="mt-5 space-y-2 border-t border-outline-variant pt-4">
          <MoneyRow label="Gaming" value={session.gamingCostFils} />
          {session.extras.map((line) => (
            <MoneyRow key={line.id} label={`${line.name} × ${line.quantity}`} value={line.totalFils} />
          ))}
          <MoneyRow label="Extras total" value={session.extrasCostFils} />
          <div className="border-t border-outline-variant pt-3">
            <MoneyRow label="TOTAL" value={session.totalFils} strong />
          </div>
          {receipt && (
            <>
              <MoneyRow label="PAID" value={receivedFils} />
              <MoneyRow label="CHANGE" value={payment.changeFils} />
            </>
          )}
        </div>
      </section>

      {!receipt && (
        <section className="space-y-5 border-t border-outline-variant bg-surface p-6 md:border-l md:border-t-0">
          <div>
            <span className="nexus-label">Payment method</span>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((item) => (
                <button
                  key={item.id}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
                    method === item.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-surface-high text-content-muted hover:border-outline'
                  }`}
                  onClick={() => setMethod(item.code)}
                  type="button"
                >
                  <Icon name={item.code === 'CASH' ? 'wallet' : 'pricing'} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="nexus-label">Payment received (JD)</span>
            <input
              className="nexus-input py-3 font-mono text-2xl"
              inputMode="decimal"
              value={received}
              onChange={(event) => setReceived(event.target.value)}
            />
          </label>
          <MoneyRow
            label={payment.remainingFils > 0 ? 'Remaining' : 'Change'}
            value={payment.remainingFils > 0 ? payment.remainingFils : payment.changeFils}
            strong
          />
          <Button className="w-full" disabled={!validAmount || !payment.isPaidInFull} onClick={() => void complete()}>
            <Icon name="checkout" /> Complete payment
          </Button>
        </section>
      )}
      </div>

      {receipt && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>
            <Icon name="transactions" /> Print
          </Button>
          <Button onClick={() => navigate('/')}>Close</Button>
        </div>
      )}
    </div>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-lg font-bold' : 'text-sm'}`}>
      <span>{label}</span>
      <span className="font-mono">{formatJod(value)}</span>
    </div>
  );
}
