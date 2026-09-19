import {
  computeGamingCostFils,
  formatDuration,
  formatJod,
  parseJodToFils,
  type BillingMethod,
  type PriceBlock,
} from '@pscenter/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import type { DashboardDto, ProductDto, ScreenCard, SessionDto } from '../lib/types';

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* ignore */
  }
}

export function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startFor, setStartFor] = useState<ScreenCard | null>(null);
  const [extrasFor, setExtrasFor] = useState<ScreenCard | null>(null);
  const [addTimeFor, setAddTimeFor] = useState<ScreenCard | null>(null);
  const [confirmStop, setConfirmStop] = useState<ScreenCard | null>(null);
  const warned = useRef(new Set<string>());

  async function refresh() {
    try {
      const [dash, prod] = await Promise.all([
        api<DashboardDto>('/api/reports/dashboard'),
        api<{ products: ProductDto[] }>('/api/products'),
      ]);
      setData(dash);
      setProducts(prod.products);
      setExtrasFor((current) =>
        current ? (dash.screens.find((screen) => screen.id === current.id) ?? null) : null,
      );
      setAddTimeFor((current) =>
        current ? (dash.screens.find((screen) => screen.id === current.id) ?? null) : null,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard');
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    const warningMinutes = data.settings.lowTimeWarningMinutes
      .split(',')
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => b - a);
    for (const screen of data.screens) {
      const session = screen.session;
      if (!session || session.remainingSeconds == null) continue;
      const mark = (key: string, message: string) => {
        if (warned.current.has(key)) return;
        warned.current.add(key);
        toast.push(message);
        if (data.settings.soundNotifications !== 'false') beep();
      };
      for (const minutes of warningMinutes) {
        const nextLower = warningMinutes.find((value) => value < minutes) ?? 0;
        if (
          session.remainingSeconds <= minutes * 60 &&
          session.remainingSeconds > nextLower * 60
        ) {
          mark(`${session.id}-${minutes}`, `${screen.name}: ${minutes} minutes remaining`);
        }
      }
      if (session.timeExpired) {
        mark(`${session.id}-0`, `${screen.name}: TIME EXPIRED`);
      }
    }
  }, [data, toast]);

  async function run(action: () => Promise<unknown>, ok?: string) {
    try {
      await action();
      if (ok) toast.push(ok);
      await refresh();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Action failed', 'err');
    }
  }

  if (error && !data) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-slate-400">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <header>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-content md:text-3xl">
            Good evening, {data.settings.businessName}
          </h2>
          <p className="mt-1 text-sm text-content-muted">
            Live stations, timers, extras, and checkout
          </p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon="wallet" label="Today's revenue" value={formatJod(data.today.totalRevenueFils)} primary />
        <Metric icon="gamepad" label="Gaming" value={formatJod(data.today.gamingRevenueFils)} />
        <Metric icon="food" label="Extras" value={formatJod(data.today.extrasRevenueFils)} />
        <Metric
          icon="screens"
          label="Floor status"
          value={`${data.activeSessions} active · ${data.availableScreens} open`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {data.screens.map((screen) => (
          <ScreenTile
            key={screen.id}
            screen={screen}
            onStart={() => setStartFor(screen)}
            onExtras={() => setExtrasFor(screen)}
            onAddTime={() => setAddTimeFor(screen)}
            onPause={() =>
              screen.session &&
              run(() => api(`/api/sessions/${screen.session!.id}/pause`, { method: 'POST' }))
            }
            onResume={() =>
              screen.session &&
              run(() => api(`/api/sessions/${screen.session!.id}/resume`, { method: 'POST' }))
            }
            onCheckout={() => {
              if (screen.status === 'CHECKOUT' && screen.session) {
                navigate(`/checkout/${screen.session.id}`);
                return;
              }
              setConfirmStop(screen);
            }}
          />
        ))}
      </div>

      {startFor && (
        <StartSessionModal
          screen={startFor}
          onClose={() => setStartFor(null)}
          onSubmit={(body) =>
            run(async () => {
              await api('/api/sessions/start', { method: 'POST', body: JSON.stringify(body) });
              setStartFor(null);
            }, `Started ${startFor.name}`)
          }
        />
      )}

      {extrasFor?.session && (
        <ExtrasModal
          screen={extrasFor}
          products={products}
          onClose={() => setExtrasFor(null)}
          onChange={() => void refresh()}
        />
      )}

      {addTimeFor?.session && (
        <AddTimeModal
          screen={addTimeFor}
          onClose={() => setAddTimeFor(null)}
          onAdd={(seconds) =>
            run(async () => {
              await api(`/api/sessions/${addTimeFor.session!.id}/add-time`, {
                method: 'POST',
                body: JSON.stringify({ seconds }),
              });
              setAddTimeFor(null);
            }, 'Time added')
          }
        />
      )}

      {confirmStop?.session && (
        <Modal title={`Stop session on ${confirmStop.name}?`} onClose={() => setConfirmStop(null)}>
          <p className="mb-4 text-sm text-slate-300">This ends billing for {confirmStop.name} and opens checkout.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmStop(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                run(async () => {
                  await api(`/api/sessions/${confirmStop.session!.id}/checkout`, { method: 'POST' });
                  const id = confirmStop.session!.id;
                  setConfirmStop(null);
                  navigate(`/checkout/${id}`);
                })
              }
            >
              Stop session
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  primary,
}: {
  icon: IconName;
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div className="nexus-panel flex min-h-28 flex-col justify-between p-4">
      <div className="flex items-center justify-between text-content-muted">
        <div className="text-[11px] font-bold uppercase tracking-[0.09em]">{label}</div>
        <Icon className={primary ? 'text-primary' : ''} name={icon} />
      </div>
      <div className={`font-mono text-xl font-semibold md:text-2xl ${primary ? 'text-primary' : 'text-content'}`}>
        {value}
      </div>
    </div>
  );
}

function ScreenTile({
  screen,
  onStart,
  onExtras,
  onAddTime,
  onPause,
  onResume,
  onCheckout,
}: {
  screen: ScreenCard;
  onStart: () => void;
  onExtras: () => void;
  onAddTime: () => void;
  onPause: () => void;
  onResume: () => void;
  onCheckout: () => void;
}) {
  const session = screen.session;
  const isWarning =
    session?.remainingSeconds != null &&
    session.remainingSeconds > 0 &&
    session.remainingSeconds <= 300;
  const activeTone =
    screen.status === 'RUNNING'
      ? 'border-primary/55 shadow-active'
      : screen.status === 'PAUSED'
        ? 'border-warn/45'
        : screen.status === 'CHECKOUT'
          ? 'border-secondary/45'
          : '';
  const borderTone = isWarning
    ? 'warning-pulse border-warn/70'
    : activeTone || 'border-outline-variant';
  return (
    <article
      className={`flex min-h-[310px] flex-col rounded-lg border bg-surface-container p-4 transition-colors ${borderTone}`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex rounded bg-surface-highest px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-content-muted">
            {screen.consoleType}
          </div>
          <h3 className="text-xl font-semibold text-content">{screen.name}</h3>
        </div>
        <StatusBadge status={screen.status} />
      </div>

      {screen.status === 'AVAILABLE' && (
        <>
          <div className="my-auto flex flex-col items-center py-5 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-surface-high text-primary">
              <Icon name="gamepad" size={32} />
            </div>
            <p className="text-sm text-content-muted">Ready for customer</p>
            <p className="mt-2 font-mono text-lg text-content">
              {formatJod(screen.hourlyRateFils)}
              <span className="text-xs text-outline"> / hour</span>
            </p>
          </div>
          <Button className="w-full" onClick={onStart}>
            <Icon name="play" /> Start session
          </Button>
        </>
      )}

      {screen.status === 'MAINTENANCE' && (
        <div className="my-auto flex flex-col items-center text-content-muted">
          <Icon className="mb-3" name="settings" size={32} />
          <p className="text-sm">Temporarily unavailable</p>
        </div>
      )}

      {session && (screen.status === 'RUNNING' || screen.status === 'PAUSED' || screen.status === 'CHECKOUT') && (
        <>
          {session.timeExpired && (
            <div className="mb-2 rounded border border-danger/40 bg-danger/10 px-2 py-1 text-center text-xs font-bold tracking-wider text-danger">
              TIME EXPIRED
            </div>
          )}
          {session.remainingSeconds != null &&
            session.remainingSeconds > 0 &&
            session.remainingSeconds <= 600 && (
              <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-warn">
                {Math.ceil(session.remainingSeconds / 60)} minutes remaining
              </div>
            )}
          <div className="mb-4 text-center font-mono text-3xl font-semibold tracking-[0.06em] text-content">
            {session.billingMode === 'FIXED' && session.remainingSeconds != null && session.remainingSeconds > 0
              ? formatDuration(session.remainingSeconds)
              : formatDuration(session.actualDurationSeconds)}
          </div>
          <dl className="mb-4 space-y-2 rounded-lg bg-surface-low p-3 font-mono text-sm">
            <Line label="Gaming" value={formatJod(session.gamingCostFils)} />
            <Line label="Extras" value={formatJod(session.extrasCostFils)} />
            <Line label="TOTAL" value={formatJod(session.totalFils)} strong />
          </dl>
          <div className="mt-auto grid grid-cols-2 gap-2">
            {screen.status !== 'CHECKOUT' && (
              <>
                <Button variant="secondary" onClick={onExtras}>
                  <Icon name="food" size={17} /> Extra
                </Button>
                <Button variant="secondary" onClick={onAddTime}>
                  <Icon name="timer" size={17} /> Time
                </Button>
              </>
            )}
            {screen.status === 'RUNNING' && (
              <Button variant="secondary" onClick={onPause}>
                <Icon name="pause" size={17} /> Pause
              </Button>
            )}
            {screen.status === 'PAUSED' && (
              <Button variant="secondary" onClick={onResume}>
                <Icon name="play" size={17} /> Resume
              </Button>
            )}
            <Button className={screen.status === 'CHECKOUT' ? 'col-span-2' : ''} onClick={onCheckout}>
              <Icon name="checkout" size={17} /> Checkout
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t border-outline-variant pt-2 text-base' : ''}`}>
      <dt className="text-content-muted">{label}</dt>
      <dd className={strong ? 'font-semibold text-primary' : 'text-content'}>{value}</dd>
    </div>
  );
}

function StartSessionModal({
  screen,
  onClose,
  onSubmit,
}: {
  screen: ScreenCard;
  onClose: () => void;
  onSubmit: (body: {
    screenId: string;
    billingMode: 'OPEN' | 'FIXED';
    plannedDurationSeconds?: number;
    notes?: string;
  }) => void;
}) {
  const [mode, setMode] = useState<'OPEN' | 'FIXED'>('OPEN');
  const [minutes, setMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const expected = useMemo(() => {
    if (mode !== 'FIXED') return null;
    let blocks: PriceBlock[] = [];
    try {
      blocks = JSON.parse(screen.blocksJson) as PriceBlock[];
    } catch {
      blocks = [];
    }
    try {
      return computeGamingCostFils({
        method: screen.billingMethod as BillingMethod,
        hourlyRateFils: screen.hourlyRateFils,
        billableSeconds: minutes * 60,
        blocks,
      });
    } catch {
      return 0;
    }
  }, [mode, minutes, screen.billingMethod, screen.blocksJson, screen.hourlyRateFils]);

  return (
    <Modal title="Start new session" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-low p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="gamepad" />
            </div>
            <div>
              <div className="font-semibold text-content">{screen.name}</div>
              <div className="text-xs text-content-muted">{screen.consoleType}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="nexus-label mb-0">Pricing</div>
            <span className="font-mono text-lg text-primary">{formatJod(screen.hourlyRateFils)}</span>
            <span className="text-xs text-outline"> / hour</span>
          </div>
        </div>
        <div>
          <span className="nexus-label">Duration</span>
          <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === 'OPEN' ? 'primary' : 'secondary'} onClick={() => setMode('OPEN')}>
            <Icon name="timer" /> Open ended
          </Button>
          <Button variant={mode === 'FIXED' ? 'primary' : 'secondary'} onClick={() => setMode('FIXED')}>
            <Icon name="calendar" /> Fixed duration
          </Button>
          </div>
        </div>
        {mode === 'FIXED' && (
          <div className="space-y-3">
            <span className="nexus-label">Select duration</span>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((m) => (
                <Button key={m} variant={minutes === m ? 'primary' : 'secondary'} onClick={() => setMinutes(m)}>
                  {m >= 60 ? `${m / 60}h` : `${m}m`}
                </Button>
              ))}
            </div>
            <label>
              <span className="nexus-label">Custom minutes</span>
              <input
                type="number"
                min={1}
                className="nexus-input"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            {expected != null && (
              <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                <span className="text-content-muted">Estimated cost</span>
                <span className="font-mono text-xl font-semibold text-content">{formatJod(expected)}</span>
              </div>
            )}
          </div>
        )}
        <label>
          <span className="nexus-label">Customer note (optional)</span>
          <input
            className="nexus-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                screenId: screen.id,
                billingMode: mode,
                plannedDurationSeconds: mode === 'FIXED' ? minutes * 60 : undefined,
                notes: notes || undefined,
              })
            }
          >
            <Icon name="play" /> Start session
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddTimeModal({
  screen,
  onClose,
  onAdd,
}: {
  screen: ScreenCard;
  onClose: () => void;
  onAdd: (seconds: number) => void;
}) {
  const [custom, setCustom] = useState(15);
  return (
    <Modal title={`Add time — ${screen.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onAdd(15 * 60)}>
          +15 min
        </Button>
        <Button variant="secondary" onClick={() => onAdd(30 * 60)}>
          +30 min
        </Button>
        <Button variant="secondary" onClick={() => onAdd(60 * 60)}>
          +1 hour
        </Button>
        <Button variant="secondary" onClick={() => onAdd(120 * 60)}>
          +2 hours
        </Button>
      </div>
      <label className="mt-4 block text-sm">
        <span className="nexus-label">Custom minutes</span>
        <input
          type="number"
          min={1}
          className="nexus-input"
          value={custom}
          onChange={(e) => setCustom(Number(e.target.value))}
        />
      </label>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onAdd(custom * 60)}>Add custom</Button>
      </div>
    </Modal>
  );
}

function ExtrasModal({
  screen,
  products,
  onClose,
  onChange,
}: {
  screen: ScreenCard;
  products: ProductDto[];
  onClose: () => void;
  onChange: () => void;
}) {
  const toast = useToast();
  const session = screen.session as SessionDto;
  const [price, setPrice] = useState('0.50');
  const [qty, setQty] = useState(1);
  const [query, setQuery] = useState('');
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function addProduct(productId: string) {
    try {
      await api(`/api/sessions/${session.id}/extras`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      onChange();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Could not add extra', 'err');
    }
  }

  async function setQtyLine(id: string, quantity: number) {
    try {
      await api(`/api/sessions/extras/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      onChange();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : 'Could not update extra', 'err');
    }
  }

  return (
    <Modal title={`Add extras to ${screen.name}`} onClose={onClose} size="xl">
      <div className="grid min-h-[480px] gap-0 lg:grid-cols-[1fr_320px]">
        <div className="pr-0 lg:pr-6">
          <div className="relative mb-4">
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              name="search"
            />
            <input
              className="nexus-input pl-10"
              placeholder="Search inventory..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleProducts.map((product) => {
              const selected = session.extras.find((line) => line.productId === product.id);
              return (
                <button
                  key={product.id}
                  className={`relative flex min-h-36 flex-col items-center justify-center rounded-lg border p-3 transition-all ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant bg-surface-container hover:border-primary hover:bg-surface-high'
                  }`}
                  onClick={() => void addProduct(product.id)}
                  type="button"
                >
                  {selected && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-on">
                      ×{selected.quantity}
                    </span>
                  )}
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-surface-highest text-primary">
                    <Icon name={productIcon(product.name, product.category)} size={28} />
                  </div>
                  <span className="text-sm font-semibold text-content">{product.name}</span>
                  <span className="mt-1 font-mono text-sm text-content-muted">
                    {formatJod(product.priceFils)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="mt-6 flex flex-col border-t border-outline-variant pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="mb-3 font-semibold text-content">Current extras</h3>
          <div className="flex-1 space-y-2">
            {session.extras.length === 0 && (
              <p className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-outline">
                Select a product to add it.
              </p>
            )}
            {session.extras.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-low p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-content">{line.name}</div>
                  <div className="font-mono text-xs text-content-muted">{formatJod(line.totalFils)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label={`Remove one ${line.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface-high text-content hover:border-primary"
                    onClick={() => void setQtyLine(line.id, Math.max(0, line.quantity - 1))}
                  >
                    <Icon name="minus" size={15} />
                  </button>
                  <span className="w-7 text-center font-mono">{line.quantity}</span>
                  <button
                    aria-label={`Add one ${line.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface-high text-content hover:border-primary"
                    onClick={() => void setQtyLine(line.id, line.quantity + 1)}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-outline-variant pt-4">
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-content-muted">Extras total</span>
              <span className="font-mono font-semibold text-content">{formatJod(session.extrasCostFils)}</span>
            </div>
            <div className="mb-4 flex justify-between text-base font-semibold">
              <span>Session total</span>
              <span className="font-mono text-primary">{formatJod(session.totalFils)}</span>
            </div>
            <details className="rounded-lg border border-outline-variant bg-surface-low p-3">
              <summary className="cursor-pointer text-sm font-semibold text-content">Custom extra</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label>
                  <span className="nexus-label">Price (JD)</span>
                  <input
                    className="nexus-input font-mono"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                </label>
                <label>
                  <span className="nexus-label">Quantity</span>
                  <input
                    className="nexus-input"
                    min={1}
                    type="number"
                    value={qty}
                    onChange={(event) => setQty(Number(event.target.value))}
                  />
                </label>
              </div>
              <Button
                className="mt-3 w-full"
                onClick={async () => {
                  try {
                    await api(`/api/sessions/${session.id}/extras`, {
                      method: 'POST',
                      body: JSON.stringify({
                        name: 'Custom extra',
                        unitPriceFils: parseJodToFils(price),
                        quantity: qty,
                      }),
                    });
                    onChange();
                  } catch (err) {
                    toast.push(err instanceof ApiError ? err.message : 'Invalid custom extra', 'err');
                  }
                }}
              >
                <Icon name="plus" /> Add custom
              </Button>
            </details>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function productIcon(name: string, category: string): IconName {
  const value = `${name} ${category}`.toLowerCase();
  if (value.includes('energy')) return 'bolt';
  if (value.includes('water') || value.includes('pepsi') || value.includes('drink')) return 'water';
  if (value.includes('coffee')) return 'coffee';
  return 'food';
}
