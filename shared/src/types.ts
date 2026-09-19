export type BillingMethod = 'PER_MINUTE' | 'PER_STARTED_HOUR' | 'FIXED_BLOCKS';
export type SessionBillingMode = 'OPEN' | 'FIXED';
export type SessionStatus = 'RUNNING' | 'PAUSED' | 'CHECKOUT' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID';
export type ScreenOperationalStatus =
  | 'AVAILABLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'CHECKOUT'
  | 'MAINTENANCE';

export interface PriceBlock {
  durationSeconds: number;
  priceFils: number;
}

export interface PauseInterval {
  pausedAtMs: number;
  resumedAtMs: number | null;
}

export const TERMINAL_SESSION_STATUSES: SessionStatus[] = ['COMPLETED', 'CANCELLED'];
export const OCCUPYING_SESSION_STATUSES: SessionStatus[] = ['RUNNING', 'PAUSED', 'CHECKOUT'];
