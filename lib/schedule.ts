/* Planningsregels — gedeeld door server (validatie) en browser (vrije vakken, live check). */

import { addDays, daysBetween, fmtLong, fmtTime, wday } from './time';

export type Hours = Record<number, [number, number]>; // weekdag → [start, eind]
export type Block = { weekday: number; start: number; dur: number; title: string };
export type Timed = { id: number; date: string; start: number; dur: number };

/** Groep van een collega die Joey overneemt, als herhaalregel. */
export type GroupRule = {
  id: number; title: string; owner: string; ownerName: string; start: number; dur: number;
  startDate: string; endDate: string | null; every: number; skip: string[]; note: string;
};
export type GroupOcc = GroupRule & { date: string };

/** "elke week", "om de week", "elke 3 weken" */
export const everyLabel = (n: number) => (n === 1 ? 'elke week' : n === 2 ? 'om de week' : `elke ${n} weken`);

/** Gaat de groep door op deze datum? */
export function groupOn(g: GroupRule, date: string) {
  if (date < g.startDate || (g.endDate && date > g.endDate) || g.skip.includes(date)) return false;
  const d = daysBetween(g.startDate, date);
  return d % (7 * g.every) === 0;
}

export const groupsOn = (groups: GroupRule[], date: string): GroupOcc[] =>
  groups.filter((g) => groupOn(g, date)).map((g) => ({ ...g, date }));

/** De eerstvolgende n keren vanaf `from` (inclusief). */
export function nextDates(g: GroupRule, from: string, n: number) {
  const out: string[] = [];
  const steps = Math.max(0, Math.ceil(daysBetween(g.startDate, from) / (7 * g.every)));
  for (let i = steps, guard = 0; out.length < n && guard < 400; i++, guard++) {
    const d = addDays(g.startDate, i * 7 * g.every);
    if (g.endDate && d > g.endDate) break;
    if (!g.skip.includes(d)) out.push(d);
  }
  return out;
}

/** Reden waarom dit moment niet kan (buiten werktijd, vast blok, overgenomen groep), of null. */
export function conflictReason(date: string, start: number, dur: number, hours: Hours, blocks: Block[], groups: GroupRule[] = []) {
  const wd = wday(date);
  const hrs = hours[wd];
  if (!hrs) return 'Joey werkt niet op deze dag.';
  if (start < hrs[0] || start + dur > hrs[1])
    return `Buiten werktijd. Joey werkt ${fmtLong(date)} van ${fmtTime(hrs[0])} tot ${fmtTime(hrs[1])}.`;
  const hit = blocks.find((b) => b.weekday === wd && start < b.start + b.dur && b.start < start + dur);
  if (hit) return `Joey heeft dan ${hit.title[0].toLowerCase() + hit.title.slice(1)} (${fmtTime(hit.start)}–${fmtTime(hit.start + hit.dur)}).`;
  const g = groupsOn(groups, date).find((x) => start < x.start + x.dur && x.start < start + dur);
  if (g) return `Joey neemt dan de groep van ${g.ownerName} over (${fmtTime(g.start)}–${fmtTime(g.start + g.dur)}).`;
  return null;
}

/** Afspraken die dit moment overlappen (mag wel, Joey's aandacht wordt dan verdeeld). */
export const overlapping = <T extends Timed>(appts: T[], date: string, start: number, dur: number, ignoreId?: number) =>
  appts.filter((a) => a.date === date && a.id !== ignoreId && start < a.start + a.dur && a.start < start + dur);

/** Vrije halfuurvakken op een dag. Vandaag: alleen vanaf nu. */
export function freeSlots(date: string, hours: Hours, blocks: Block[], appts: Timed[], today: string, now: number, groups: GroupRule[] = []) {
  const hrs = hours[wday(date)];
  if (!hrs || date < today) return [];
  const out: number[] = [];
  for (let t = hrs[0]; t + 30 <= hrs[1]; t += 30) {
    if (date === today && t < now) continue;
    if (!conflictReason(date, t, 30, hours, blocks, groups) && !overlapping(appts, date, t, 30).length) out.push(t);
  }
  return out;
}

/** Begin en eind van het tijdrooster op hele uren: werktijden, verbreed voor afspraken die erbuiten vallen. */
export function gridBounds(hours: Hours, appts: { start: number; dur: number }[] = []): [number, number] {
  const starts = [...Object.values(hours).map((x) => x[0]), ...appts.map((a) => a.start)];
  const ends = [...Object.values(hours).map((x) => x[1]), ...appts.map((a) => a.start + a.dur)];
  if (!starts.length) return [8 * 60, 17 * 60];
  return [Math.floor(Math.min(...starts) / 60) * 60, Math.ceil(Math.max(...ends) / 60) * 60];
}

/** Overlappende afspraken naast elkaar zetten (banen). */
export function layoutDay<T extends Timed>(evs: T[]) {
  const sorted = [...evs].sort((a, b) => a.start - b.start || b.dur - a.dur);
  const out: { a: T; lane: number; lanes: number; span: number; shared: number }[] = [];
  let cluster: { a: T; lane: number }[] = [];
  let end = -1;
  const flush = () => {
    const lanesEnd: number[] = [];
    cluster.forEach((o) => {
      let l = lanesEnd.findIndex((e) => e <= o.a.start);
      if (l < 0) {
        l = lanesEnd.length;
        lanesEnd.push(0);
      }
      lanesEnd[l] = o.a.start + o.a.dur;
      o.lane = l;
    });
    // span: zo veel banen rechts erbij als er op dat moment vrij zijn, zodat een afspraak niet onnodig smal wordt
    const busy = (lane: number, a: T) =>
      cluster.some((x) => x.lane === lane && x.a.id !== a.id && a.start < x.a.start + x.a.dur && x.a.start < a.start + a.dur);
    cluster.forEach((o) => {
      let span = 1;
      while (o.lane + span < lanesEnd.length && !busy(o.lane + span, o.a)) span++;
      out.push({ ...o, lanes: lanesEnd.length, span, shared: overlapping(sorted, o.a.date, o.a.start, o.a.dur, o.a.id).length });
    });
    cluster = [];
  };
  sorted.forEach((a) => {
    if (a.start >= end && cluster.length) {
      flush();
      end = -1;
    }
    cluster.push({ a, lane: 0 });
    end = Math.max(end, a.start + a.dur);
  });
  if (cluster.length) flush();
  return out;
}

/** "Henk", "Henk en Ria", "Henk, Ria en Piet" */
export const listNames = (n: string[]) => (n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' en ' + n[n.length - 1]);
