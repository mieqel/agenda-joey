'use client';

/* Kleine gedeelde bouwstenen, zoals exView/facts/pasteView in de demo. */

import { parsePaste } from '@/lib/parse-paste';
import type { Detail, Ex } from './client';
import { useApp } from './AppProvider';

export function ExTable({ ex }: { ex: Ex[] | undefined }) {
  if (!ex?.length) return <p className="muted" style={{ margin: 0 }}>Geen oefeningen meegegeven.</p>;
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Oefening</th>
            <th>Sets × reps</th>
            <th>Belasting / notitie</th>
          </tr>
        </thead>
        <tbody>
          {ex.map((e, i) => (
            <tr key={i}>
              <td>{e.name}</td>
              <td className="setsreps">
                {e.sets} × {e.reps}
              </td>
              <td className="muted">{e.load}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PasteView({ txt }: { txt: string }) {
  const { toast } = useApp();
  if (!txt) return null;
  const ex = parsePaste(txt);
  const copy = () =>
    navigator.clipboard?.writeText(txt).then(
      () => toast('Gekopieerd'),
      () => toast('Kopiëren lukt hier niet, selecteer de tekst'),
    );
  return (
    <div className="box">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <h3>
          Oefeningen{' '}
          <span className="hint" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
            geplakt uit Intramed
          </span>
        </h3>
        <button className="btn small" onClick={copy}>
          Kopieer
        </button>
      </div>
      {ex.length > 0 && <ExTable ex={ex} />}
      <details open={!ex.length}>
        <summary className="hint" style={{ cursor: 'pointer' }}>
          Originele tekst
        </summary>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', margin: '8px 0 0', background: 'var(--surface-2)', padding: 10, borderRadius: 8 }}>
          {txt}
        </pre>
      </details>
    </div>
  );
}

export function Facts({ p }: { p: Detail['patient'] }) {
  if (!p) return null;
  return (
    <div className="box">
      <div className="facts">
        <div>
          <span className="label">Doel</span>
          {p.goal || '—'}
        </div>
        <div>
          <span className="label">Klacht</span>
          {p.complaint || '—'}
        </div>
        {p.birthYear && (
          <div>
            <span className="label">Geboren</span>
            <span className="mono">{p.birthYear}</span>
          </div>
        )}
      </div>
      {p.notes && (
        <div className="err" style={{ fontWeight: 500, color: 'var(--fg)' }}>
          <strong style={{ color: 'var(--warn)' }}>Let op:</strong> {p.notes}
        </div>
      )}
    </div>
  );
}
