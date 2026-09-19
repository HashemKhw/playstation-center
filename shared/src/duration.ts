import type { PauseInterval } from './types.js';

export function computePausedMs(pauses: PauseInterval[], nowMs: number): number {
  let total = 0;
  for (const pause of pauses) {
    const end = pause.resumedAtMs ?? nowMs;
    if (end < pause.pausedAtMs) continue;
    total += end - pause.pausedAtMs;
  }
  return total;
}

export function computeBillableSeconds(params: {
  startTimeMs: number;
  nowMs: number;
  pauses: PauseInterval[];
  endTimeMs?: number | null;
}): number {
  const until = params.endTimeMs ?? params.nowMs;
  const elapsedMs = Math.max(0, until - params.startTimeMs);
  const pausedMs = computePausedMs(params.pauses, until);
  return Math.max(0, Math.floor((elapsedMs - pausedMs) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':');
}

export function formatDurationCompact(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
