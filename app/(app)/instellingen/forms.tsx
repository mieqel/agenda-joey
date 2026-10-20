'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { DAYSL } from '@/lib/time';
import { addBlock, addStaff, saveHours, type FormState } from './actions';

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>
      {pending ? 'Bezig…' : children}
    </button>
  );
}

function Msg({ s }: { s: FormState }) {
  if (s.error) return <div className="err" role="alert">{s.error}</div>;
  if (s.ok) return <div className="pill ok" role="status" style={{ alignSelf: 'flex-start', padding: '5px 10px' }}>✓ {s.ok}</div>;
  return null;
}

/** Formulier leegmaken na succes. */
function useResetOnOk(s: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (s.ok) ref.current?.reset();
  }, [s]);
  return ref;
}

export function AddStaffForm({ suggestHue }: { suggestHue: number }) {
  const [s, action] = useFormState(addStaff, {});
  const ref = useResetOnOk(s);
  return (
    <form ref={ref} action={action} className="form" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div className="label">Collega toevoegen</div>
      <div className="frow">
        <label className="field"><span className="label">Volledige naam</span><input name="name" placeholder="Sanne de Wit" required /></label>
        <label className="field"><span className="label">Naam in agenda</span><input name="displayName" placeholder="Sanne" /></label>
        <label className="field"><span className="label">Functie</span><input name="roleLabel" placeholder="Fysiotherapeut" /></label>
        <label className="field">
          <span className="label">Kleur (0–359)</span>
          <input name="hue" type="number" min={0} max={359} defaultValue={suggestHue} />
        </label>
      </div>
      <Msg s={s} />
      <Submit>Toevoegen</Submit>
    </form>
  );
}

export function HoursForm({ hours }: { hours: Record<number, [string, string]> }) {
  const [s, action] = useFormState(saveHours, {});
  return (
    <form action={action} className="form">
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Dag</th>
              <th>Werkt</th>
              <th>Van</th>
              <th>Tot</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((wd) => (
              <tr key={wd}>
                <td>{DAYSL[wd]}</td>
                <td><input type="checkbox" name={`on${wd}`} defaultChecked={!!hours[wd]} aria-label={`Werkt op ${DAYSL[wd]}`} style={{ width: 'auto' }} /></td>
                <td><input type="time" step={900} name={`s${wd}`} defaultValue={hours[wd]?.[0] ?? '10:00'} aria-label={`${DAYSL[wd]} van`} /></td>
                <td><input type="time" step={900} name={`e${wd}`} defaultValue={hours[wd]?.[1] ?? '18:00'} aria-label={`${DAYSL[wd]} tot`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Msg s={s} />
      <Submit>Werktijden opslaan</Submit>
    </form>
  );
}

export function AddBlockForm() {
  const [s, action] = useFormState(addBlock, {});
  const ref = useResetOnOk(s);
  return (
    <form ref={ref} action={action} className="form" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div className="label">Blok toevoegen</div>
      <div className="frow">
        <label className="field">
          <span className="label">Dag</span>
          <select name="weekday" defaultValue="1">
            {[1, 2, 3, 4, 5, 6].map((wd) => <option key={wd} value={wd}>{DAYSL[wd]}</option>)}
          </select>
        </label>
        <label className="field"><span className="label">Begin</span><input type="time" step={900} name="start" defaultValue="12:30" /></label>
        <label className="field">
          <span className="label">Duur (min)</span>
          <input name="dur" type="number" min={15} max={480} step={15} defaultValue={60} />
        </label>
        <label className="field"><span className="label">Wat</span><input name="title" placeholder="Groepsles" /></label>
      </div>
      <Msg s={s} />
      <Submit>Blok toevoegen</Submit>
    </form>
  );
}
