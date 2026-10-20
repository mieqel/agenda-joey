/* Planningsregels — gedeeld door server (validatie) en browser (vrije vakken, live check). */

import { fmtLong, fmtTime, wday } from './time';

export type Hours = Record<number, [number, number]>; // weekdag → [start, eind]
export type Block = { weekday: number; start: number; dur: number; title: string };
export type Timed = { id: number; date: string; start: number; dur: number };

/** Reden waarom dit moment niet kan (buiten werktijd, vast blok), of null. */
export function conflictReason(date: string, start: number, dur: number, hours: Hours, blocks: Block[]) {
  const wd = wday(date);
  const hrs = hours[wd];
  if (!hrs) return 'Joey werkt niet op deze dag.';
  if (start < hrs[0] || start + dur > hrs[1])
    return `Buiten werktijd. Joey werkt ${fmtLong(date)} van ${fmtTime(hrs[0])} tot ${fmtTime(hrs[1])}.`;
  const hit = blocks.find((b) => b.weekday === wd && start < b.start + b.dur && b.start < start + dur);
  if (hit) return `Joey heeft dan ${hit.title[0].toLowerCase() + hit.title.slice(1)} (${fmtTime(hit.start)}–${fmtTime(hit.start + hit.dur)}).`;
  return null;
}

/** Afspraken die dit moment overlappen (mag wel, Joey's aandacht wordt dan verdeeld). */
export const overlapping = <T extends Timed>(appts: T[], date: string, start: number, dur: number, ignoreId?: number) =>
  appts.filter((a) => a.date === date && a.id !== ignoreId && start < a.start + a.dur && a.start < start + dur);

/** Vrije halfuurvakken op een dag. Vandaag: alleen vanaf nu. */
export function freeSlots(date: string, hours: Hours, blocks: Block[], appts: Timed[], today: string, now: number) {
  const hrs = hours[wday(date)];
  if (!hrs || date < today) return [];
  const out: number[] = [];
  for (let t = hrs[0]; t + 30 <= hrs[1]; t += 30) {
    if (date === today && t < now) continue;
    if (!conflictReason(date, t, 30, hours, blocks) && !overlapping(appts, date, t, 30).length) out.push(t);
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
  const out: { a: T; lane: number; lanes: number; shared: number }[] = [];
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
    cluster.forEach((o) =>
      out.push({ ...o, lanes: lanesEnd.length, shared: overlapping(sorted, o.a.date, o.a.start, o.a.dur, o.a.id).length }),
    );
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
