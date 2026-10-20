'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { parsePaste } from '@/lib/parse-paste';
import { fmtDate, fmtTime } from '@/lib/time';
import { initials } from '@/lib/staff';
import { useApp } from '../AppProvider';
import { ExTable, Facts } from '../bits';
import { ApiError, send, type Detail, type Ex } from '../client';

type Item = { id: number; name: string; complaint: string | null };
type Profile = NonNullable<Detail['patient']> & {
  appointments: { id: number; date: string; start: number; instruction: string; pastedPlan: string; done: boolean; by: string; byName: string; exercises: Ex[] }[];
};

export function PatientenView() {
  const { me, openAppt, openBooking, toast } = useApp();
  const { data: list, mutate: mutateList } = useSWR<Item[]>('/api/patients');
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const shown = (list ?? []).filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
  useEffect(() => {
    if (list?.length && (sel === null || !list.some((p) => p.id === sel))) setSel(list[0].id);
  }, [list, sel]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r: { id: number } = await send('/api/patients', 'POST', { name: newName });
      await mutateList();
      setSel(r.id);
      setAdding(false);
      setNewName('');
      toast('Patiënt toegevoegd');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Toevoegen lukte niet.');
    }
  };

  return (
    <div className="pgrid">
      <div className="plist">
        <input placeholder="Zoek patiënt…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Zoek patiënt" />
        {shown.map((x) => (
          <button key={x.id} className="pitem" aria-current={x.id === sel} onClick={() => setSel(x.id)}>
            <div className="avatar">{initials(x.name)}</div>
            <div style={{ minWidth: 0 }}>
              <strong>{x.name}</strong>
              <div className="muted" style={{ fontSize: '.8rem' }}>{x.complaint}</div>
            </div>
          </button>
        ))}
        {list && !shown.length && <div className="pitem muted">Geen patiënt gevonden.</div>}
        {me.isOwner &&
          (adding ? (
            <form onSubmit={add} style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--line)' }}>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Voor- en achternaam" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px' }} />
              <button className="btn small primary" type="submit">Toevoegen</button>
            </form>
          ) : (
            <button className="pitem" onClick={() => setAdding(true)} style={{ color: 'var(--accent)', fontWeight: 600 }}>+ Patiënt toevoegen</button>
          ))}
      </div>
      {sel !== null ? (
        <PatientProfile key={sel} id={sel} onOpen={openAppt} onBook={(id) => openBooking({ patientId: id })} onSaved={() => mutateList()} />
      ) : (
        <section className="profile">
          <div className="muted">{list ? 'Nog geen patiënten.' : 'Laden…'}</div>
        </section>
      )}
    </div>
  );
}

function PatientProfile({ id, onOpen, onBook, onSaved }: { id: number; onOpen: (id: number) => void; onBook: (id: number) => void; onSaved: () => void }) {
  const { me, toast } = useApp();
  const { data: p, mutate } = useSWR<Profile>(`/api/patients/${id}`);
  const [editing, setEditing] = useState(false);
  if (!p) return <section className="profile"><div className="muted">Laden…</div></section>;

  const latest = [...p.appointments].reverse().find((a) => a.exercises.length || a.pastedPlan);
  const plan = latest ? (latest.exercises.length ? latest.exercises : parsePaste(latest.pastedPlan)) : undefined;

  return (
    <section className="profile">
      <div className="sheet-head">
        <div>
          <div className="label">Patiënt</div>
          <h2>{p.name}</h2>
        </div>
        <div className="actions">
          {me.isOwner && !editing && <button className="btn small" onClick={() => setEditing(true)}>Gegevens aanpassen</button>}
          <button className="btn small primary" onClick={() => onBook(p.id)}>Inplannen bij Joey</button>
        </div>
      </div>
      {editing ? (
        <EditFacts
          p={p}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            mutate();
            onSaved();
            toast('Opgeslagen');
          }}
        />
      ) : (
        <Facts p={p} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3>Huidig oefenschema</h3>
        {latest && <span className="hint">Uit de afspraak van {fmtDate(latest.date)}, meegegeven door {latest.byName}</span>}
        <ExTable ex={plan} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3>Afspraken bij Joey</h3>
        {p.appointments.length ? (
          p.appointments.map((a) => (
            <button key={a.id} className="card" style={{ padding: '10px 14px' }} onClick={() => onOpen(a.id)}>
              <div className="when">
                <b>{fmtTime(a.start)}</b>
                {fmtDate(a.date)}
              </div>
              <div className="body">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.instruction || '—'}</span>
                <span className="muted" style={{ fontSize: '.82rem' }}>via {a.byName}</span>
              </div>
              {a.done && <span className="pill ok">Gedaan</span>}
            </button>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>Nog geen afspraken.</p>
        )}
      </div>
    </section>
  );
}

function EditFacts({ p, onCancel, onSaved }: { p: Profile; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: p.name, birthYear: p.birthYear ? String(p.birthYear) : '', goal: p.goal ?? '', complaint: p.complaint ?? '', notes: p.notes ?? '',
  });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = f.birthYear.trim() ? Number(f.birthYear) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) return setErr('Geboortejaar klopt niet.');
    try {
      await send(`/api/patients/${p.id}`, 'PATCH', { ...f, birthYear: year });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Opslaan lukte niet.');
    }
  };
  return (
    <form className="box form" onSubmit={save}>
      <div className="frow">
        <label className="field"><span className="label">Naam</span><input value={f.name} onChange={set('name')} /></label>
        <label className="field"><span className="label">Geboortejaar</span><input inputMode="numeric" value={f.birthYear} onChange={set('birthYear')} /></label>
      </div>
      <label className="field"><span className="label">Doel</span><input value={f.goal} onChange={set('goal')} /></label>
      <label className="field"><span className="label">Klacht</span><input value={f.complaint} onChange={set('complaint')} /></label>
      <label className="field"><span className="label">Let op</span><textarea value={f.notes} onChange={set('notes')} /></label>
      <span className="hint">Alleen wat Joey nodig heeft voor de training. Geen BSN, verzekering of medisch dossier: dat blijft in Intramed.</span>
      {err && <div className="err">{err}</div>}
      <div className="actions">
        <button className="btn primary" type="submit">Opslaan</button>
        <button className="btn" type="button" onClick={onCancel}>Annuleren</button>
      </div>
    </form>
  );
}
