/**
 * Scheduling helpers (Increment 5). Instants are stored/transported as UTC
 * ISO strings; `datetime-local` inputs are interpreted in the editor's
 * local zone and converted to UTC. Display is local + relative + UTC title.
 */

export function isOverdue(iso: string, now: number = Date.now()): boolean {
  return new Date(iso).getTime() <= now;
}

/** `Date` → `datetime-local` value (`YYYY-MM-DDTHH:mm`) in the local zone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value → UTC ISO, or null when unparseable. */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Shortest UTC label for tooltips, e.g. `2026-09-14 10:30 UTC`. */
export function toUtcLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

/** Local short label, e.g. `14/09/2026 12:30`. */
export function toLocalLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Locale-aware relative label (`in 3 hours`, `hace 2 horas`) or `now`. */
export function toRelativeLabel(iso: string, locale: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(locale === 'es' ? 'es' : 'en', { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return rtf.format(0, 'second');
  if (abs < hour) return rtf.format(Math.trunc(diffMs / minute), 'minute');
  if (abs < day) return rtf.format(Math.trunc(diffMs / hour), 'hour');
  return rtf.format(Math.trunc(diffMs / day), 'day');
}

/** Editor timezone offset label, e.g. `UTC+2`. */
export function localZoneLabel(date: Date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.trunc(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}
