import type { ScreenStatus } from '../lib/types';
import { Icon, type IconName } from './Icon';

const labels: Record<ScreenStatus, string> = {
  AVAILABLE: 'AVAILABLE',
  RUNNING: 'PLAYING',
  PAUSED: 'PAUSED',
  CHECKOUT: 'CHECKOUT',
  MAINTENANCE: 'MAINTENANCE',
};

export function StatusBadge({ status }: { status: ScreenStatus }) {
  const tone =
    status === 'RUNNING'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : status === 'AVAILABLE'
        ? 'border-outline-variant bg-surface-highest text-content-muted'
        : status === 'PAUSED'
          ? 'border-warn/40 bg-warn/10 text-warn'
          : status === 'CHECKOUT'
            ? 'border-secondary/40 bg-secondary/10 text-secondary'
            : 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] ${tone}`}
    >
      <Icon name={statusIcon[status]} size={13} />
      {labels[status]}
    </span>
  );
}

const statusIcon: Record<ScreenStatus, IconName> = {
  AVAILABLE: 'screens',
  RUNNING: 'play',
  PAUSED: 'pause',
  CHECKOUT: 'checkout',
  MAINTENANCE: 'settings',
};
