'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fmtDate, fmtLong, fmtTime } from '@/lib/time';
import { Avatar } from '../components/Avatar';
import { useApp } from './AppProvider';
import { ExTable, Facts, PasteView } from './bits';
import { ACT, ApiError, fmtAgo, send, type Detail } from './client';

export function ApptDetail({ id }: { id: number }) {
  const { me, staff, today, closeSheet, openBooking, refresh, toast } = useApp();
  const { data: a, error, mutate } = useSWR<Detail>(`/api/appointments/${id}`, { refreshInterval: 0 });
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wasNew, setWasNew] = useState<boolean | null>(null);

  // Joey opent de afspraak: oranje stip weg
  useEffect(() => {
    if (!a || wasNew !== null) return;
    setWasNew(!a.seen && a.by.id !== me.id);
    if (me.isOwner && !a.seen) send(`/api/appointments/${id}/seen`, 'POST').then(refresh, () => {});
  }, [a, id, me, refresh, wasNew]);

  if (error)
    return (
      <>
        <div className="sheet-head">
          <h2>Afspraak</h2>
          <button className="btn small" onClick={closeSheet}>Sluiten</button>
        </div>
        <div className="err">{error instanceof ApiError ? error.message : 'Kon de afspraak niet laden.'}</div>
      </>
    );
  if (!a) return <div className="muted">Laden…</div>;

  const act = async (fn: () => Promise<unknown>, msg: string, close = true) => {
    setBusy(true);
    try {
      await fn();
      refresh();
      if (close) closeSheet();
      else mutate();
      toast(msg);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  };
  const first = a.patient?.name.split(' ')[0];

  return (
    <>
      <div className="sheet-head">
        <div>
          <div className="label">
            {fmtLong(a.date)} · {fmtTime(a.start)}–{fmtTime(a.start + a.dur)}
          </div>
          <h2>{a.name}</h2>
          {!a.patient && <span className="pill nieuw">Nieuwe patiënt</span>}
        </div>
        <button className="btn small" onClick={closeSheet}>Sluiten</button>
      </div>

      <div className="box todo">
        <div className="from">
          <Avatar id={a.by.id} name={a.by.name} />
          <div>
            <strong>Ingepland door {a.by.name}</strong>
            <div className="muted" style={{ fontSize: '.85rem' }}>{a.by.roleLabel}</div>
          </div>
          {wasNew && me.isOwner && <span className="pill nieuw" style={{ marginLeft: 'auto' }}>Nieuw</span>}
        </div>
        <div className="label">Wat moet je doen</div>
        <div className="todo-text">{a.instruction || '—'}</div>
      </div>

      {(a.exercises.length > 0 || !a.pastedPlan) && (
        <div className="box">
          <h3>Oefeningen</h3>
          <ExTable ex={a.exercises} />
        </div>
      )}
      <PasteView txt={a.pastedPlan} />
      <Facts p={a.patient} />

      {a.history.length > 0 && (
        <div className="box">
          <h3>Geschiedenis</h3>
          {a.history.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '.9rem' }}>
              <Avatar id={l.who} name={staff[l.who]?.name ?? l.whoName} size={26} />
              <span style={{ flex: 1 }}>
                <strong>{l.whoName}</strong> {ACT[l.action]}
                {l.note && ` (${l.note})`}
                {l.from && ` (was ${l.from})`}
              </span>
              <span className="muted mono" style={{ fontSize: '.8rem' }}>{fmtAgo(l.at, today)}</span>
            </div>
          ))}
        </div>
      )}

      {a.together.length > 0 && (
        <div className="warnbox">
          <strong>
            👥 Tegelijk met {a.together.length} andere patiënt{a.together.length > 1 ? 'en' : ''}
          </strong>
          {a.together.map((x) => (
            <span key={x.id}>
              {x.name} · {fmtTime(x.start)}–{fmtTime(x.start + x.dur)} · via {x.byName}
            </span>
          ))}
        </div>
      )}

      {a.others.length > 0 && (
        <div className="box">
          <h3>Andere afspraken met {first}</h3>
          {a.others.map((x) => (
            <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '.9rem' }}>
              <span>
                {fmtDate(x.date)} <span className="mono">{fmtTime(x.start)}</span>
              </span>
              <span className="muted">via {x.byName}</span>
            </div>
          ))}
        </div>
      )}

      <div className="actions">
        {me.isOwner && (
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => act(() => send(`/api/appointments/${a.id}/done`, 'POST', { done: !a.done }), a.done ? 'Teruggezet' : 'Afgerond')}
          >
            {a.done ? 'Toch niet gedaan' : 'Afgerond'}
          </button>
        )}
        <button className="btn" onClick={() => openBooking({ edit: a })}>Verzetten / aanpassen</button>
        <button className="btn" onClick={() => openBooking({ date: a.date, start: a.start })}>+ Nog iemand om {fmtTime(a.start)}</button>
        {me.isOwner && !a.patient && (
          <button
            className="btn"
            disabled={busy}
            onClick={() => act(() => send(`/api/appointments/${a.id}/patient`, 'POST'), `${a.name} staat nu bij Patiënten`, false)}
          >
            Patiënt aanmaken
          </button>
        )}
        <button className="btn ghost" onClick={() => setConfirmDel(true)}>Afspraak verwijderen</button>
      </div>
      {confirmDel && (
        <div className="box">
          <strong>Afspraak met {a.name} verwijderen?</strong>
          <div className="actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => act(() => send(`/api/appointments/${a.id}`, 'DELETE'), 'Afspraak verwijderd, het vak is weer vrij')}
            >
              Ja, verwijderen
            </button>
            <button className="btn" onClick={() => setConfirmDel(false)}>Nee</button>
          </div>
        </div>
      )}
    </>
  );
}
