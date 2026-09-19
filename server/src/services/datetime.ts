export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

function zonedOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function zonedDate(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = zonedOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export const DateTime = {
  range(period: ReportPeriod, timeZone: string, from?: string, to?: string): { start: Date; end: Date } {
    if (period === 'custom') {
      if (!from || !to) throw new Error('Custom range requires from and to dates');
      const [ys, ms, ds] = from.split('-').map(Number);
      const [ye, me, de] = to.split('-').map(Number);
      return {
        start: zonedDate(timeZone, ys, ms, ds),
        end: addDays(zonedDate(timeZone, ye, me, de), 1),
      };
    }

    const now = new Date();
    const p = zonedParts(now, timeZone);
    const todayStart = zonedDate(timeZone, p.year, p.month, p.day);

    if (period === 'today') {
      return { start: todayStart, end: addDays(todayStart, 1) };
    }
    if (period === 'yesterday') {
      return { start: addDays(todayStart, -1), end: todayStart };
    }
    if (period === 'week') {
      const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday ?? 'Sun');
      const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;
      const weekStart = addDays(todayStart, mondayOffset);
      return { start: weekStart, end: addDays(todayStart, 1) };
    }
    const monthStart = zonedDate(timeZone, p.year, p.month, 1);
    return { start: monthStart, end: addDays(todayStart, 1) };
  },
};
