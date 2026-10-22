'use client';

/* Overgenomen groepen: details (iedereen) en formulier (alleen Joey). */

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { everyLabel, groupOn, nextDates, type GroupRule } from '@/lib/schedule';
import { DAYSL, addDays, fmtDate, fmtLong, fmtTime, wday, weekStartOf } from '@/lib/time';
import { Avatar } from '../components/Avatar';
import { useApp, type GroupOpts } from './AppProvider';
import { ApiError, send, type AgendaData } from './client';

const cssVars = (v: Record<string, string>) => v as React.CSSProperties;

/** "elke week op maandag · vanaf ma 19 okt · doorlopend" */
function seriesText(g: GroupRule) {
  if (g.endDate === g.startDate) return `eenmalig op ${fmtLong(g.startDate)}`;
  return `${everyLabel(g.every)} op ${DAYSL[wday(g.startDate)]} · vanaf ${fmtDate(g.startDate)} · ${
    g.endDate ? `t/m ${fmtDate(g.endDate)}` : 'doorlopend'
  }`;
}

export function GroupDetail({ id, date }: { id: number; date: string }) {
  const { me, staff, today, closeSheet, openGroupForm, refresh, toast } = useApp();
  const { data } = useSWR<AgendaData>(`/api/agenda?week=${weekStartOf(date)}`);
  const [confirm, setConfirm] = useState<null | 'stop' | 'delete'>(null);
  const [busy, setBusy] = useState(false);
  const g = data?.groups.find((x) => x.id === id);

  const head = (
    <div className="sheet-head">
      <div className="label">Overgenomen groep</div>
      <button className="btn small" onClick={closeSheet}>Sluiten</button>
    </div>
  );
  if (!data) return <>{head}<div className="muted">Laden…</div></>;
  if (!g) return <>{head}<div className="err">Deze groep staat niet meer in de agenda.</div></>;

  const act = async (body: unknown, msg: string, close = true) => {
    setBusy(true);
    try {
      await send(`/api/groups/${g.id}`, body === 'DELETE' ? 'DELETE' : 'PATCH', body === 'DELETE' ? undefined : body);
      refresh();
      if (close) closeSheet();
      toast(msg);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  };
  const owner = staff[g.owner];
  const on = groupOn(g, date);
  const upcoming = nextDates(g, today, 6);
  const skippedAhead = g.skip.filter((d) => d >= today);

  return (
    <>
      {head}
      <div className="ghero" style={cssVars({ '--c': `var(--s-${g.owner})` })}>
        <Avatar id={g.owner} name={owner?.name ?? g.ownerName} size={52} />
        <div style={{ minWidth: 0 }}>
          <div className="ghero-k">Groep van {g.ownerName}</div>
          <h2>{g.title}</h2>
          <div className="ghero-t">
            {fmtLong(date)} · <span className="mono">{fmtTime(g.start)}–{fmtTime(g.start + g.dur)}</span>
          </div>
        </div>
        <span className="gbadge">
          <RepeatIcon /> Joey neemt over
        </span>
      </div>
      {!on && <div className="err">Deze keer gaat niet door (overgeslagen).</div>}

      <div className="box">
        <h3>Reeks</h3>
        <div className="cap">{seriesText(g)}</div>
        {upcoming.length > 0 && (
          <>
            <div className="label">Komende keren</div>
            <div className="datechips">
              {upcoming.map((d) => (
                <span key={d} className={d === date ? 'on' : ''}>{fmtDate(d)}</span>
              ))}
            </div>
          </>
        )}
        {skippedAhead.length > 0 && (
          <>
            <div className="label">Gaat niet door op</div>
            <div className="datechips">
              {skippedAhead.map((d) => (
                <span key={d} className="off">
                  {fmtDate(d)}
                  {me.isOwner && (
                    <button type="button" disabled={busy} aria-label={`${fmtDate(d)} toch laten doorgaan`} onClick={() => act({ op: 'unskip', date: d }, `${fmtDate(d)} gaat toch door`, false)}>
                      ↺
                    </button>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {g.note && (
        <div className="box">
          <h3>Notitie</h3>
          <div className="todo-text">{g.note}</div>
        </div>
      )}

      {!me.isOwner ? (
        <div className="hint" style={{ fontSize: '.9rem' }}>
          Joey geeft in deze tijd de groep van {g.ownerName}. Er kan dan niemand bij hem worden ingepland.
        </div>
      ) : (
        <>
          <div className="actions">
            <button className="btn primary" onClick={() => openGroupForm({ edit: g })}>Aanpassen</button>
            {on && (
              <button className="btn" disabled={busy} onClick={() => act({ op: 'skip', date }, `${fmtDate(date)} gaat niet door, het vak is weer vrij`)}>
                Alleen deze keer niet
              </button>
            )}
            <button className="btn" onClick={() => setConfirm('stop')}>Stoppen vanaf deze keer</button>
            <button className="btn ghost" onClick={() => setConfirm('delete')}>Hele reeks verwijderen</button>
          </div>
          {confirm && (
            <div className="box">
              <strong>
                {confirm === 'stop'
                  ? `Groep van ${g.ownerName} stoppen vanaf ${fmtDate(date)}? Eerdere keren blijven in de agenda staan.`
                  : `Alle keren van deze groep verwijderen, ook die in het verleden?`}
              </strong>
              <div className="actions">
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    confirm === 'stop'
                      ? act({ op: 'stop', date }, `Groep van ${g.ownerName} stopt na ${fmtDate(addDays(date, -1))}`)
                      : act('DELETE', `Groep van ${g.ownerName} verwijderd`)
                  }
                >
                  Ja
                </button>
                <button className="btn" onClick={() => setConfirm(null)}>Nee</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 7a5 5 0 0 1 8.9-3.1L13 5.5M13.5 9a5 5 0 0 1-8.9 3.1L3 10.5" />
      <path d="M13 2.5v3h-3M3 13.5v-3h3" />
    </svg>
  );
}

/* ---------- formulier ---------- */

const FREQ = [
  { v: 0, label: 'Eenmalig' },
  { v: 1, label: 'Elke week' },
  { v: 2, label: 'Om de week' },
  { v: 3, label: 'Elke 3 weken' },
  { v: 4, label: 'Elke 4 weken' },
];
const TIMES = Array.from({ length: (22 - 7) * 4 + 1 }, (_, i) => 7 * 60 + i * 15);

export function GroupForm({ opts }: { opts: GroupOpts }) {
  const { staff, today, closeSheet, refresh, toast, setNav } = useApp();
  const e = opts.edit;
  const coworkers = useMemo(
    () => Object.values(staff).filter((s) => !s.isOwner && (s.isActive || s.id === e?.owner)).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [staff, e?.owner],
  );

  const [owner, setOwner] = useState(e?.owner ?? '');
  const [title, setTitle] = useState(e?.title ?? 'Groepsles');
  const [startDate, setStartDate] = useState(e?.startDate ?? opts.date ?? today);
  const [start, setStart] = useState(e?.start ?? opts.start ?? 11 * 60);
  const [end, setEnd] = useState(e ? e.start + e.dur : (opts.start ?? 11 * 60) + 120);
  const [freq, setFreq] = useState(e ? (e.endDate === e.startDate ? 0 : e.every) : 1);
  const [until, setUntil] = useState(e?.endDate && e.endDate !== e.startDate ? e.endDate : '');
  const [hasEnd, setHasEnd] = useState(!!until);
  const [note, setNote] = useState(e?.note ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const endDate = freq === 0 ? startDate : hasEnd && until ? until : null;
  const preview: GroupRule = {
    id: 0, title, owner, ownerName: staff[owner]?.displayName ?? '', start, dur: end - start,
    startDate, endDate, every: freq || 1, skip: [], note,
  };
  const dates = validDate ? nextDates(preview, startDate, 5) : [];
  const ownerName = staff[owner]?.displayName;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr('');
    if (!owner) return setErr('Kies van wie de groep is.');
    if (!validDate) return setErr('Kies de datum van de eerste keer.');
    if (end <= start) return setErr('De eindtijd moet na de begintijd liggen.');
    if (endDate && endDate < startDate) return setErr('De einddatum ligt vóór de eerste keer.');
    const input = { ownerId: owner, title: title.trim(), startDate, endDate, every: freq || 1, start, dur: end - start, note };
    setBusy(true);
    try {
      const res: { clashes?: number } = e
        ? await send(`/api/groups/${e.id}`, 'PATCH', { op: 'edit', input })
        : await send('/api/groups', 'POST', input);
      setNav({ weekStart: weekStartOf(startDate), day: startDate });
      refresh();
      closeSheet();
      toast(
        `${e ? 'Bijgewerkt' : `Groep van ${ownerName} staat in de agenda`}${
          res.clashes ? ` · let op: ${res.clashes} afspra${res.clashes > 1 ? 'ken vallen' : 'ak valt'} in deze tijd` : ''
        }`,
      );
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Opslaan lukte niet. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sheet-head">
        <div>
          <div className="label">{e ? 'Overgenomen groep' : 'In Joey’s agenda zetten'}</div>
          <h2>{e ? 'Groep aanpassen' : 'Groep overnemen'}</h2>
        </div>
        <button className="btn small" onClick={closeSheet}>Annuleren</button>
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <div className="box">
          <h3>Van wie is de groep?</h3>
          <div className="ptiles" role="radiogroup" aria-label="Collega">
            {coworkers.map((s) => (
              <label key={s.id} className="ptile" style={cssVars({ '--c': `var(--s-${s.id})` })}>
                <input type="radio" name="owner" value={s.id} checked={owner === s.id} onChange={() => setOwner(s.id)} />
                <Avatar id={s.id} name={s.name} size={30} />
                <span>{s.displayName}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span className="label">Naam van de groep</span>
            <input value={title} maxLength={60} placeholder="Groepsles" onChange={(x) => setTitle(x.target.value)} />
          </label>
        </div>

        <div className="box">
          <h3>Wanneer</h3>
          <div className="frow">
            <label className="field">
              <span className="label">{freq === 0 ? 'Datum' : 'Eerste keer'}</span>
              <input type="date" value={startDate} onChange={(x) => setStartDate(x.target.value)} />
            </label>
            <label className="field">
              <span className="label">Van</span>
              <select value={start} onChange={(x) => {
                const s = +x.target.value;
                setEnd((en) => (en <= s ? s + (end - start) : en));
                setStart(s);
              }}>
                {TIMES.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">Tot</span>
              <select value={end} onChange={(x) => setEnd(+x.target.value)}>
                {TIMES.filter((t) => t > start).map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </label>
          </div>
          <div className="field">
            <span className="label">Herhalen</span>
            <div className="chips" role="radiogroup" aria-label="Herhalen">
              {FREQ.map((f) => (
                <button key={f.v} type="button" role="radio" aria-checked={freq === f.v} onClick={() => setFreq(f.v)}>{f.label}</button>
              ))}
            </div>
          </div>
          {freq > 0 && (
            <div className="field">
              <span className="label">Tot wanneer</span>
              <div className="chips" role="radiogroup" aria-label="Tot wanneer">
                <button type="button" role="radio" aria-checked={!hasEnd} onClick={() => setHasEnd(false)}>Doorlopend</button>
                <button type="button" role="radio" aria-checked={hasEnd} onClick={() => setHasEnd(true)}>Tot en met…</button>
              </div>
              {hasEnd && <input type="date" value={until} min={startDate} onChange={(x) => setUntil(x.target.value)} aria-label="Laatste keer" style={{ maxWidth: 220 }} />}
            </div>
          )}
          {dates.length > 0 && (
            <div className="field">
              <span className="label">{freq === 0 ? 'Gaat door op' : 'Eerste keren'}</span>
              <div className="datechips">
                {dates.map((d) => <span key={d}>{fmtDate(d)}</span>)}
                {freq > 0 && (!endDate || nextDates(preview, addDays(dates[dates.length - 1], 1), 1).length > 0) && <span className="more">…</span>}
              </div>
            </div>
          )}
        </div>

        <div className="box">
          <h3>Notitie <span className="muted" style={{ fontWeight: 400, fontSize: '.85rem' }}>(optioneel)</span></h3>
          <label className="field">
            <textarea value={note} maxLength={500} placeholder="Bijv. groep zit in zaal 2, deelnemerslijst ligt bij de balie" onChange={(x) => setNote(x.target.value)} />
          </label>
        </div>

        {owner && validDate && end > start && (
          <div className="gpreview" style={cssVars({ '--c': `var(--s-${owner})` })}>
            <b>{title || 'Groepsles'}</b>
            <span>
              Groep van {ownerName} · {fmtTime(start)}–{fmtTime(end)} · {freq === 0 ? 'eenmalig' : everyLabel(freq)}
            </span>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : e ? 'Opslaan' : 'Groep overnemen'}</button>
        </div>
      </form>
    </>
  );
}
