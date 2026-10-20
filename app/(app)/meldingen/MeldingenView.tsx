'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fmtLong, fmtTime } from '@/lib/time';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../AppProvider';
import { ACT, fmtAgo, send } from '../client';

type Log = {
  id: number; who: string; whoName: string; action: string; appt: number; exists: boolean; pname: string;
  date: string; start: number; from: string | null; note: string | null; at: string; read: boolean;
};

export function MeldingenView() {
  const { openAppt, today, refresh } = useApp();
  const { data: list } = useSWR<Log[]>('/api/meldingen');
  // wat ongelezen was toen je de tab opende, blijft gemarkeerd tot je weggaat
  const fresh = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!list) return;
    const unread = list.filter((l) => !l.read).map((l) => l.id);
    if (!fresh.current) fresh.current = new Set(unread);
    else unread.forEach((id) => fresh.current!.add(id));
    if (unread.length) send('/api/meldingen/read', 'POST').then(refresh, () => {});
  }, [list, refresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h2>Meldingen</h2>
        <div className="muted">Elke keer dat een collega iets in je agenda zet, verzet of verwijdert, zie je hier wie het was.</div>
      </div>
      <div className="cards">
        {!list ? (
          <div className="empty">Laden…</div>
        ) : !list.length ? (
          <div className="empty">Nog geen meldingen.</div>
        ) : (
          list.map((l) => {
            const isNew = fresh.current?.has(l.id) ?? !l.read;
            return (
              <button
                key={l.id}
                className="card"
                disabled={!l.exists}
                onClick={() => l.exists && openAppt(l.appt)}
                style={isNew ? { borderColor: 'var(--warn)' } : undefined}
              >
                <Avatar id={l.who} name={l.whoName} />
                <div className="body">
                  <span>
                    <strong>{l.whoName}</strong> {ACT[l.action]}: <strong>{l.pname}</strong>
                  </span>
                  <span className="muted" style={{ fontSize: '.88rem' }}>
                    {l.action === 'MOVE' && l.from ? `van ${l.from} naar ` : ''}
                    {fmtLong(l.date)} om {fmtTime(l.start)}
                    {l.note ? ` · ${l.note}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="muted mono" style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>{fmtAgo(l.at, today)}</span>
                  {isNew && <span className="pill nieuw">Nieuw</span>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
