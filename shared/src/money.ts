export const FILS_PER_JD = 100;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

function assertFils(value: number, label = 'amount'): void {
  if (!Number.isInteger(value)) {
    throw new MoneyError(`${label} must be an integer number of fils`);
  }
}

export function addFils(...values: number[]): number {
  return values.reduce((sum, value) => {
    assertFils(value);
    return sum + value;
  }, 0);
}

export function subtractFils(left: number, right: number): number {
  assertFils(left, 'left');
  assertFils(right, 'right');
  return left - right;
}

export function multiplyFils(amount: number, factor: number): number {
  assertFils(amount);
  if (!Number.isInteger(factor)) {
    throw new MoneyError('quantity/factor must be an integer');
  }
  return amount * factor;
}

/** Integer division that rounds to nearest fils (half away from zero). */
export function divideFils(amount: number, divisor: number): number {
  assertFils(amount);
  if (!Number.isInteger(divisor) || divisor === 0) {
    throw new MoneyError('divisor must be a non-zero integer');
  }
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const q = Math.trunc(abs / divisor);
  const rem = abs % divisor;
  const roundUp = rem * 2 >= divisor;
  return sign * (q + (roundUp ? 1 : 0));
}

export function parseJodToFils(input: string): number {
  const trimmed = input.trim().replace(/\s*JD\s*$/i, '').replace(/,/g, '');
  if (!trimmed) {
    throw new MoneyError('price is required');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new MoneyError('enter a valid amount with up to 2 decimal places');
  }
  const negative = trimmed.startsWith('-');
  const [wholeRaw, fracRaw = ''] = trimmed.replace('-', '').split('.');
  const whole = Number.parseInt(wholeRaw, 10);
  const frac = Number.parseInt(fracRaw.padEnd(2, '0') || '0', 10);
  const fils = whole * FILS_PER_JD + frac;
  return negative ? -fils : fils;
}

export function formatJod(fils: number, options?: { withUnit?: boolean }): string {
  assertFils(fils);
  const withUnit = options?.withUnit ?? true;
  const sign = fils < 0 ? '-' : '';
  const abs = Math.abs(fils);
  const jd = Math.floor(abs / FILS_PER_JD);
  const remainder = abs % FILS_PER_JD;
  const body = `${sign}${jd}.${remainder.toString().padStart(2, '0')}`;
  return withUnit ? `${body} JD` : body;
}

export function assertNonNegativeFils(value: number, label = 'amount'): void {
  assertFils(value, label);
  if (value < 0) {
    throw new MoneyError(`${label} cannot be negative`);
  }
}
