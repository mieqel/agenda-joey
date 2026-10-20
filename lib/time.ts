/* Datum- en tijdhulpjes. Datums zijn "YYYY-MM-DD" (Europe/Amsterdam), tijden minuten na middernacht. */

export const TZ = 'Europe/Amsterdam';

export const h = (hh: number, mm = 0) => hh * 60 + mm;

export const fmtTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Vandaag in Nederland, als "YYYY-MM-DD". */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

/** Minuten na middernacht, Nederlandse tijd. */
export function nowMinutes(now = new Date()) {
  const [hh, mm] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(now)
    .split(':')
    .map(Number);
  return hh * 60 + mm;
}

const d2 = (s: string) => new Date(s + 'T12:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (s: string, n: number) => {
  const d = d2(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

/** 0 = zondag … 6 = zaterdag */
export const wday = (s: string) => d2(s).getUTCDay();

/** Maandag van de week waarin s valt. */
export const weekStartOf = (s: string) => addDays(s, -((wday(s) + 6) % 7));

/** "YYYY-MM-DD" ↔ Prisma @db.Date */
export const toDbDate = (s: string) => new Date(s + 'T00:00:00Z');
export const fromDbDate = (d: Date) => iso(d);

export const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
export const DAYSL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const fmtDate = (s: string) => {
  const d = d2(s);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
export const fmtLong = (s: string) => {
  const d = d2(s);
  return `${DAYSL[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
