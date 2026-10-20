/* Typen en fetch-hulpjes voor de browser. */

import type { Block, Hours } from '@/lib/schedule';

export type Kind = 'training' | 'intake' | 'controle';
export const ACT: Record<string, string> = { ADD: 'heeft ingepland', EDIT: 'heeft aangepast', MOVE: 'heeft verzet', DELETE: 'heeft verwijderd' };

export type Appt = {
  id: number; patientId: number | null; name: string; date: string; start: number; dur: number;
  kind: Kind; by: string; hasPlan: boolean; done: boolean; seen: boolean;
};
export type AgendaData = { weekStart: string; today: string; now: number; hours: Hours; blocks: Block[]; appts: Appt[] };
export type Ex = { name: string; sets: string; reps: string; load: string };
export type Lite = { id: number; date: string; start: number; dur: number; name: string; by: string; byName: string };
export type Detail = {
  id: number; date: string; start: number; dur: number; kind: Kind; name: string;
  patient: { id: number; name: string; birthYear: number | null; goal: string | null; complaint: string | null; notes: string | null } | null;
  newPatientName: string | null; instruction: string; pastedPlan: string; done: boolean; seen: boolean;
  by: { id: string; name: string; roleLabel: string }; exercises: Ex[];
  history: { id: number; who: string; whoName: string; action: string; note: string | null; from: string | null; at: string }[];
  together: Lite[]; others: { id: number; date: string; start: number; byName: string }[];
};
export type Unread = { count: number; latest: null | { who: string; action: string; pname: string; date: string; start: number } };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function handle(r: Response) {
  if (r.status === 401) {
    window.location.href = '/login';
    throw new ApiError('Niet ingelogd', 401);
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(body.error || 'Er ging iets mis. Probeer het opnieuw.', r.status);
  return body;
}

export const fetcher = (url: string) => fetch(url).then(handle);
export const send = (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) =>
  fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(handle);

/** Tijdstip van een melding: "vandaag 09:31", "gisteren 16:44", "do 15 okt 14:02" */
export function fmtAgo(ts: string, today: string) {
  const d = new Date(ts);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(d);
  const t = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(d);
  const y = new Date(today + 'T12:00:00Z');
  y.setUTCDate(y.getUTCDate() - 1);
  if (day === today) return `vandaag ${t}`;
  if (day === y.toISOString().slice(0, 10)) return `gisteren ${t}`;
  const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], M = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const dd = new Date(day + 'T12:00:00Z');
  return `${DAYS[dd.getUTCDay()]} ${dd.getUTCDate()} ${M[dd.getUTCMonth()]} ${t}`;
}
