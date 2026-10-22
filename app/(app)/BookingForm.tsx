'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { parsePaste } from '@/lib/parse-paste';
import { everyLabel, freeSlots, gridBounds, listNames } from '@/lib/schedule';
import { addDays, fmtDate, fmtTime, weekStartOf } from '@/lib/time';
import { useApp, type BookOpts } from './AppProvider';
import { ApiError, send, type AgendaData, type Ex, type Lite } from './client';

type Result = { date: string; err: string | null; with: Lite[] };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const REPEAT = [
  { v: 0, label: 'Eenmalig' },
  { v: 1, label: 'Elke week' },
  { v: 2, label: 'Om de week' },
  { v: 3, label: 'Elke 3 weken' },
  { v: 4, label: 'Elke 4 weken' },
];

export function BookingForm({ opts }: { opts: BookOpts }) {
  const { me, today, closeSheet, refresh, toast, setNav } = useApp();
  const router = useRouter();
  const path = usePathname();
  const edit = opts.edit;

  const [date, setDate] = useState(edit?.date ?? opts.date ?? today);
  const [start, setStart] = useState(edit?.start ?? opts.start ?? 9 * 60);
  const [dur, setDur] = useState(edit?.dur ?? 30);
  // 30 of 60 min; een oude afspraak van 45 min houdt die duur tot je hem aanpast
  const durs = edit && ![30, 60].includes(edit.dur) ? [30, edit.dur, 60] : [30, 60];
  // soort afspraak is uit de app gehaald; bestaande waarde blijft bij aanpassen behouden
  const kind = edit?.kind ?? 'training';
  const [every, setEvery] = useState(0); // 0 = eenmalig, anders om de zoveel weken
  const [count, setCount] = useState(6);
  const repeat = every ? count : 1;
  const [pk, setPk] = useState<'bestaand' | 'nieuw'>('bestaand');
  const [patientId, setPatientId] = useState<number | null>(opts.patientId ?? null);
  const [pFilter, setPFilter] = useState('');
  const [newName, setNewName] = useState('');
  const [todo, setTodo] = useState(edit?.instruction ?? '');
  const [em, setEm] = useState<'paste' | 'manual'>(edit && edit.exercises.length && !edit.pastedPlan ? 'manual' : 'paste');
  const [paste, setPaste] = useState(edit?.pastedPlan ?? '');
  const [ex, setEx] = useState<Ex[]>(edit ? edit.exercises.map((e) => ({ ...e })) : [{ name: '', sets: '3', reps: '15', load: '' }]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [saveErr, setSaveErr] = useState('');
  const [busy, setBusy] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);
  const lastExRef = useRef<HTMLInputElement>(null);

  const { data: week } = useSWR<AgendaData>(isDate(date) ? `/api/agenda?week=${weekStartOf(date)}` : null);
  const { data: patients } = useSWR<{ id: number; name: string; complaint: string | null }[]>(edit ? null : '/api/patients');

  // zonder gekozen tijd: eerste vrije vak van die dag
  const pickedStart = useRef(edit !== undefined || opts.start !== undefined);
  useEffect(() => {
    if (pickedStart.current || !week) return;
    pickedStart.current = true;
    const f = freeSlots(date, week.hours, week.blocks, week.appts, week.today, week.now, week.groups);
    if (f.length) setStart(f[0]);
  }, [week, date]);

  const times = useMemo(() => {
    const [g0, g1] = week ? gridBounds(week.hours) : [8 * 60, 17 * 60];
    const t: number[] = [];
    for (let m = g0; m < g1; m += 15) t.push(m);
    if (!t.includes(start)) t.push(start);
    return t.sort((a, b) => a - b);
  }, [week, start]);

  const filtered = useMemo(
    () => (patients ?? []).filter((p) => p.name.toLowerCase().includes(pFilter.trim().toLowerCase())),
    [patients, pFilter],
  );
  useEffect(() => {
    if (filtered.length && !filtered.some((p) => p.id === patientId)) setPatientId(filtered[0].id);
  }, [filtered, patientId]);

  // live beschikbaarheid
  const reps = edit ? 1 : repeat;
  useEffect(() => {
    if (!isDate(date)) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch('/api/availability', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, start, dur, repeat: reps, every: every || 1, ignoreId: edit?.id }),
        signal: ctl.signal,
      })
        .then((r) => r.json())
        .then((b) => setResults(b.results ?? null))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [date, start, dur, reps, every, edit?.id]);

  const bad = results?.filter((x) => x.err) ?? [];
  const sh = results?.filter((x) => x.with.length) ?? [];
  const allBad = !!results && bad.length === results.length;
  const saveLabel = sh.length && !allBad ? (edit ? 'Toch opslaan' : 'Toch inplannen') : edit ? 'Opslaan' : 'Inplannen';


  const nParsed = parsePaste(paste).length;
  const setExField = (i: number, k: keyof Ex, v: string) => setEx((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (allBad || busy) return;
    setSaveErr('');
    const body = { date, start, dur, kind, instruction: todo, pastedPlan: paste, exercises: ex.filter((x) => x.name.trim()) };
    setBusy(true);
    try {
      if (edit) {
        await send(`/api/appointments/${edit.id}`, 'PATCH', body);
        toast(me.isOwner ? 'Afspraak bijgewerkt' : 'Bijgewerkt, Joey krijgt een melding');
        setNav({ weekStart: weekStartOf(date), day: date });
      } else {
        if (pk === 'nieuw' && !newName.trim()) {
          newNameRef.current?.focus();
          setBusy(false);
          return;
        }
        if (pk === 'bestaand' && !patientId) {
          setSaveErr('Kies een patiënt.');
          setBusy(false);
          return;
        }
        const res: { created: { id: number; date: string }[]; name: string } = await send('/api/appointments', 'POST', {
          ...body,
          repeat,
          every: every || 1,
          patientId: pk === 'bestaand' ? patientId : null,
          newPatientName: pk === 'nieuw' ? newName.trim() : null,
        });
        const d0 = res.created[0].date;
        setNav({ weekStart: weekStartOf(d0), day: d0 });
        toast(
          `${me.isOwner ? '' : 'Joey krijgt een melding. '}${res.name} staat bij Joey op ${fmtDate(d0)} ${fmtTime(start)}${
            res.created.length > 1 ? `, ${everyLabel(every || 1)} (${res.created.length} keer)` : ''
          }`,
        );
      }
      refresh();
      closeSheet();
      if (path !== '/') router.push('/');
    } catch (err) {
      setSaveErr(err instanceof ApiError ? err.message : 'Opslaan lukte niet. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sheet-head">
        <div>
          <div className="label">{edit ? 'Afspraak aanpassen' : 'In Joey’s agenda zetten'}</div>
          <h2>{edit ? edit.name : 'Patiënt inplannen'}</h2>
        </div>
        <button className="btn small" onClick={closeSheet}>Annuleren</button>
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <div className="box">
          <h3>Wanneer</h3>
          <div className="frow">
            <label className="field">
              <span className="label">Datum</span>
              <input id="fD" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Tijd</span>
              <select id="fT" value={start} onChange={(e) => setStart(+e.target.value)}>
                {times.map((t) => (
                  <option key={t} value={t}>{fmtTime(t)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Duur</span>
              <select id="fU" value={dur} onChange={(e) => setDur(+e.target.value)}>
                {durs.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </label>
          </div>
          {!edit && (
            <div className="field">
              <span className="label">Herhalen</span>
              <div className="chips" id="fR" role="radiogroup" aria-label="Herhalen">
                {REPEAT.map((r) => (
                  <button key={r.v} type="button" role="radio" aria-checked={every === r.v} onClick={() => setEvery(r.v)}>{r.label}</button>
                ))}
              </div>
              {every > 0 && (
                <div className="repeat-row">
                  <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <span className="label">Aantal keer</span>
                    <select value={count} onChange={(e) => setCount(+e.target.value)} style={{ width: 'auto' }}>
                      {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}×</option>)}
                    </select>
                  </label>
                  {isDate(date) && (
                    <span className="hint">
                      {fmtDate(date)} t/m {fmtDate(addDays(date, 7 * every * (count - 1)))}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          <div aria-live="polite">
            {results && allBad && <div className="err">{bad[0].err}</div>}
            {results && !allBad && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bad.length > 0 && (
                  <div className="err">
                    {bad.length} van {results.length} momenten kunnen niet ({bad.map((x) => fmtDate(x.date)).join(', ')}). Die worden overgeslagen.
                  </div>
                )}
                {sh.length > 0 ? (
                  <div className="warnbox">
                    <strong>👥 Joey is dan al met iemand bezig</strong>
                    <span>
                      {results.length > 1 ? `Op ${sh.map((x) => fmtDate(x.date)).join(', ')} heeft` : 'Op dit moment heeft'} Joey al{' '}
                      <b>{listNames(sh[0].with.map((a) => a.name))}</b> (
                      {sh[0].with.map((a) => `${fmtTime(a.start)}–${fmtTime(a.start + a.dur)}, via ${a.byName}`).join('; ')}).
                    </span>
                    <span>Je kunt toch inplannen. Joey helpt dan meerdere mensen tegelijk, dus zijn aandacht wordt verdeeld.</span>
                  </div>
                ) : (
                  !bad.length && (
                    <div className="pill ok" style={{ alignSelf: 'flex-start', fontSize: '.85rem', padding: '5px 10px' }}>
                      ✓ Joey is vrij{results.length > 1 ? ` op alle ${results.length} momenten` : ''}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="box">
          <h3>Patiënt</h3>
          {edit ? (
            <div>{edit.name}</div>
          ) : (
            <>
              <div className="seg" role="group">
                <button type="button" aria-pressed={pk === 'bestaand'} onClick={() => setPk('bestaand')}>Bestaande patiënt</button>
                <button type="button" aria-pressed={pk === 'nieuw'} onClick={() => setPk('nieuw')}>Nieuwe patiënt</button>
              </div>
              {pk === 'bestaand' ? (
                <div className="field">
                  <input placeholder="Zoek patiënt…" value={pFilter} onChange={(e) => setPFilter(e.target.value)} aria-label="Zoek patiënt" />
                  <select value={patientId ?? ''} onChange={(e) => setPatientId(+e.target.value)} aria-label="Patiënt">
                    {filtered.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {patients && !filtered.length && <span className="hint">Geen patiënt gevonden. Kies “Nieuwe patiënt” om een naam in te vullen.</span>}
                </div>
              ) : (
                <label className="field">
                  <input ref={newNameRef} placeholder="Voor- en achternaam" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </label>
              )}
            </>
          )}
        </div>

        <div className="box">
          <h3>Wat moet Joey doen</h3>
          <label className="field">
            <span className="label">Focus / instructie</span>
            <textarea placeholder="Bijv. focus op quadriceps, rustig opbouwen, geen draaibewegingen" value={todo} onChange={(e) => setTodo(e.target.value)} />
          </label>
          <div className="label">Oefeningen</div>
          <div className="seg" role="group">
            <button type="button" aria-pressed={em === 'paste'} onClick={() => setEm('paste')}>Plakken uit Intramed</button>
            <button type="button" aria-pressed={em === 'manual'} onClick={() => setEm('manual')}>Zelf invullen</button>
          </div>
          {em === 'paste' ? (
            <div className="field">
              <textarea
                style={{ minHeight: 140 }}
                placeholder="Kopieer het oefenprogramma in Intramed (Ctrl+C) en plak het hier (Ctrl+V)"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
              <span className="hint">
                {!paste.trim() ? (
                  'Opmaak maakt niet uit. Regels zoals "Leg extension 3x15" worden automatisch een oefening.'
                ) : nParsed ? (
                  <>
                    <span style={{ color: 'var(--ok)', fontWeight: 700 }}>
                      ✓ {nParsed} oefening{nParsed > 1 ? 'en' : ''} herkend
                    </span>{' '}
                    · de originele tekst blijft ook bewaard
                  </>
                ) : (
                  'Geplakt. Joey ziet de tekst precies zoals hij hier staat.'
                )}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Oefening</th>
                      <th>Sets</th>
                      <th>Reps</th>
                      <th>Belasting</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.length ? (
                      ex.map((e, i) => (
                        <tr key={i}>
                          <td>
                            <input ref={i === ex.length - 1 ? lastExRef : undefined} value={e.name} placeholder="Leg extension" aria-label="Oefening" onChange={(v) => setExField(i, 'name', v.target.value)} />
                          </td>
                          <td>
                            <input className="num" value={e.sets} aria-label="Sets" onChange={(v) => setExField(i, 'sets', v.target.value)} />
                          </td>
                          <td>
                            <input className="num" value={e.reps} aria-label="Reps" onChange={(v) => setExField(i, 'reps', v.target.value)} />
                          </td>
                          <td>
                            <input value={e.load} placeholder="10 kg" aria-label="Belasting" onChange={(v) => setExField(i, 'load', v.target.value)} />
                          </td>
                          <td>
                            <button type="button" className="icon-btn" aria-label="Verwijder" onClick={() => setEx((xs) => xs.filter((_, j) => j !== i))}>×</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="muted">Nog geen oefeningen.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn small"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  setEx((xs) => [...xs, { name: '', sets: '3', reps: '12', load: '' }]);
                  setTimeout(() => lastExRef.current?.focus(), 0);
                }}
              >
                + Oefening
              </button>
              <span className="hint">Tip: reps mag ook tijd of afstand zijn, zoals &quot;30 s&quot; of &quot;20 m&quot;.</span>
            </div>
          )}
        </div>
        {saveErr && <div className="err" role="alert">{saveErr}</div>}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={allBad || busy} style={{ opacity: allBad ? 0.5 : 1 }}>
            {busy ? 'Bezig…' : saveLabel}
          </button>
        </div>
      </form>
    </>
  );
}
