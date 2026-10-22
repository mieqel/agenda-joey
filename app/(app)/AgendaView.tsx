'use client';

import Link from 'next/link';
import { Fragment, useEffect } from 'react';
import useSWR from 'swr';
import { everyLabel, freeSlots, gridBounds, groupsOn, layoutDay, overlapping, type GroupOcc } from '@/lib/schedule';
import { addDays, DAYS, fmtDate, fmtLong, fmtTime, MONTHS, wday, weekStartOf } from '@/lib/time';
import { initials } from '@/lib/staff';
import { Avatar } from '../components/Avatar';
import { useApp } from './AppProvider';
import { ACT, type AgendaData, type Appt, type Unread } from './client';

const px = (m: number) => `calc(var(--slot) * ${m / 30})`;
const cssVars = (v: Record<string, string>) => v as React.CSSProperties;

function weekNo(s: string) {
  const d = new Date(s + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const w1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((+d - +w1) / 864e5 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7);
}

export function AgendaView() {
  const { me, staff, nav, setNav, openBooking, openGroup, openGroupForm, sheet, tourOpen, today } = useApp();
  const { data } = useSWR<AgendaData>(`/api/agenda?week=${nav.weekStart}`);
  const { data: unread } = useSWR<Unread>(me.isOwner ? '/api/unread' : null);
  const hours = data?.hours ?? {};
  // ma–za; zaterdag alleen als Joey dan werkt
  const nDays = !data || hours[6] ? 6 : 5;
  const days = Array.from({ length: nDays }, (_, i) => addDays(nav.weekStart, i));
  const lastDay = days[days.length - 1];
  const dag = nav.mode === 'dag';
  const weekGroups = data ? days.flatMap((d) => groupsOn(data.groups, d)) : [];

  const stepDay = (n: number) => {
    let d = addDays(nav.day, n);
    for (let i = 0; i < 7 && !hours[wday(d)]; i++) d = addDays(d, n);
    setNav({ day: d, weekStart: weekStartOf(d) });
  };
  const prev = () => (dag ? stepDay(-1) : setNav({ weekStart: addDays(nav.weekStart, -7) }));
  const next = () => (dag ? stepDay(1) : setNav({ weekStart: addDays(nav.weekStart, 7) }));
  const goToday = () => setNav({ weekStart: weekStartOf(today), day: today });
  const setMode = (mode: 'week' | 'dag') =>
    setNav(mode === 'dag' && (nav.day < nav.weekStart || nav.day > lastDay) ? { mode, day: nav.weekStart } : { mode });

  // sneltoetsen als er niets open is
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (sheet || tourOpen || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft') prev();
      else if (k === 'arrowright') next();
      else if (k === 't') goToday();
      else if (k === 'd') setMode('dag');
      else if (k === 'w') setMode('week');
      else if (k === 'n') openBooking({});
      else if (k === 'g' && me.isOwner) openGroupForm({});
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const latest = unread?.latest;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {me.isOwner ? (
        unread && unread.count > 0 && latest && (
          <Link className="card" href="/meldingen" style={{ borderColor: 'var(--warn)', background: 'var(--warn-soft)', color: 'inherit', textDecoration: 'none' }}>
            <Avatar id={latest.who} name={staff[latest.who]?.name ?? latest.who} />
            <div className="body">
              <strong>
                {unread.count} nieuwe wijziging{unread.count > 1 ? 'en' : ''} in je agenda
              </strong>
              <span style={{ fontSize: '.9rem' }}>
                Laatste: {staff[latest.who]?.displayName} {ACT[latest.action]} {latest.pname} · {fmtDate(latest.date)} {fmtTime(latest.start)}
              </span>
            </div>
            <span className="pill nieuw">Bekijk</span>
          </Link>
        )
      ) : (
        <div className="box" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
          <Avatar id={me.id} name={me.name} />
          <div>
            Hoi {me.displayName}. Klik op een <strong style={{ color: 'var(--ok)' }}>groen vrij vak</strong> om een patiënt bij Joey in te plannen. Joey ziet dat jij het hebt ingepland.
          </div>
        </div>
      )}

      <div className="navbar">
        <div className="nav" style={{ gap: 6 }}>
          <button className="ibtn" id="prev" onClick={prev} aria-label={dag ? 'Vorige dag' : 'Vorige week'} title="Vorige (←)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3 5 8l5 5" /></svg>
          </button>
          <button className="ibtn" id="next" onClick={next} aria-label={dag ? 'Volgende dag' : 'Volgende week'} title="Volgende (→)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 3 5 5-5 5" /></svg>
          </button>
          <button className="todaybtn" onClick={goToday} title="Vandaag (T)">Vandaag</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 150 }}>
          <span className="datehead">{dag ? fmtLong(nav.day) : `Week ${weekNo(nav.weekStart)}`}</span>
          <span className="kbdhint">
            {dag
              ? `week ${weekNo(nav.day)} · ${MONTHS[+nav.day.slice(5, 7) - 1]} ${nav.day.slice(0, 4)}`
              : `${fmtDate(days[0])} – ${fmtDate(lastDay)} ${lastDay.slice(0, 4)}`}
          </span>
        </div>
        <div className="daystrip" role="group" aria-label="Kies een dag">
          {days.map((d) => {
            const n = data?.appts.filter((a) => a.date === d).length ?? 0;
            const gs = weekGroups.filter((g) => g.date === d);
            const dt = new Date(d + 'T12:00:00Z');
            return (
              <button
                key={d}
                className={`dchip ${d === today ? 'today' : ''} ${data && !hours[wday(d)] ? 'offday' : ''}`}
                aria-current={dag && nav.day === d}
                onClick={() => setNav({ day: d, mode: 'dag' })}
              >
                <small>{DAYS[dt.getUTCDay()]}</small>
                <b>{dt.getUTCDate()}</b>
                <i>{n ? `${n} afspr.` : 'leeg'}</i>
                {gs.length > 0 && (
                  <span className="gdots" aria-label={`${gs.length} overgenomen groep${gs.length > 1 ? 'en' : ''}`}>
                    {gs.map((g) => <em key={g.id} style={{ background: `var(--s-${g.owner})` }} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="seg viewseg" role="group" aria-label="Weergave">
          <button aria-pressed={dag} onClick={() => setMode('dag')} title="Dag (D)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h10M3 8h10M3 12h10" /></svg>Dag
          </button>
          <button aria-pressed={!dag} onClick={() => setMode('week')} title="Week (W)">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="10" rx="2" /><path d="M6 3v10M10 3v10" /></svg>Week
          </button>
        </div>
        <div className="bookbtns">
          {me.isOwner && (
            <button className="btn grpbtn" onClick={() => openGroupForm({})} title="Groep van een collega overnemen (G)">
              <GroupIcon /> Groep
            </button>
          )}
          <button className="btn primary" id="book" onClick={() => openBooking({})}>+ Inplannen</button>
        </div>
      </div>

      {weekGroups.length > 0 && (
        <section className="grpbar" aria-label="Overgenomen groepen deze week">
          <div className="grpbar-h">
            <GroupIcon />
            <div>
              <strong>{me.isOwner ? 'Groepen die je deze week overneemt' : 'Joey neemt deze week groepen over'}</strong>
              <small>In deze tijd kan niemand bij Joey worden ingepland.</small>
            </div>
          </div>
          <div className="grpbar-list">
            {weekGroups.map((g) => (
              <button
                key={`${g.id}-${g.date}`}
                className="gchip"
                style={cssVars({ '--c': `var(--s-${g.owner})` })}
                onClick={() => openGroup(g.id, g.date)}
              >
                <Avatar id={g.owner} name={staff[g.owner]?.name ?? g.ownerName} size={26} />
                <span>
                  <b>{g.ownerName}</b>
                  <small>
                    {fmtDate(g.date)} · {fmtTime(g.start)}–{fmtTime(g.start + g.dur)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="legend">
        <span><i className="sw" style={{ background: 'var(--k-training)', border: '1px solid var(--line)' }} />Afspraak</span>
        <span><i className="sw" style={{ background: 'var(--k-groep)', border: '1px solid var(--line)' }} />Les (vast blok)</span>
        <span><i className="sw sw-grp" />Overgenomen groep (kleur collega)</span>
        <span><i className="sw" style={{ background: 'var(--ok-soft)', border: '1px dashed var(--ok)' }} />Vrij</span>
        <span>
          <i className="sw" style={{ background: 'repeating-linear-gradient(135deg,var(--block) 0 3px,transparent 3px 6px)', border: '1px solid var(--line)' }} />
          Niet aanwezig
        </span>
        <span><i className="sw" style={{ background: 'var(--muted)', width: 4 }} />Rand = wie het inplande</span>
        <span style={{ marginLeft: 'auto' }}>
          Sneltoetsen: <span className="kbd">←</span> <span className="kbd">→</span> <span className="kbd">T</span> vandaag · <span className="kbd">D</span>/<span className="kbd">W</span> ·{' '}
          <span className="kbd">N</span> nieuw
          {me.isOwner && (
            <>
              {' '}· <span className="kbd">G</span> groep
            </>
          )}
        </span>
      </div>

      {!data ? (
        <div className="empty">Agenda laden…</div>
      ) : dag ? (
        <DayList date={nav.day} data={data} />
      ) : (
        <WeekGrid days={days} data={data} />
      )}
    </div>
  );
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="2.2" />
      <circle cx="11" cy="6.5" r="1.8" />
      <path d="M1.8 13c.4-2.2 1.9-3.4 3.7-3.4s3.3 1.2 3.7 3.4M9.6 10.1c.5-.3 1-.4 1.4-.4 1.5 0 2.7 1 3 3" />
    </svg>
  );
}

/** Blok van een overgenomen groep in het weekrooster. */
function GroupEv({ g, g0, pos }: { g: GroupOcc; g0: number; pos: React.CSSProperties }) {
  const { openGroup } = useApp();
  return (
    <button
      className="ev grp"
      onClick={() => openGroup(g.id, g.date)}
      style={{ ...cssVars({ '--c': `var(--s-${g.owner})` }), top: `calc(${px(g.start - g0)} + 1px)`, height: `calc(${px(g.dur)} - 3px)`, ...pos }}
      title={`${g.title} · groep van ${g.ownerName} · ${everyLabel(g.every)}`}
    >
      <em className="gk">Groep {g.ownerName}</em>
      <b>{g.title}</b>
      <span>{fmtTime(g.start)}–{fmtTime(g.start + g.dur)} · Joey neemt over</span>
    </button>
  );
}

function WeekGrid({ days, data }: { days: string[]; data: AgendaData }) {
  const occ = days.flatMap((d) => groupsOn(data.groups, d));
  const [g0, g1] = gridBounds(data.hours, [...data.appts, ...occ]);
  return (
    <div className="grid-scroll">
      <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(120px, 1fr))`, minWidth: 52 + days.length * 120 }}>
        <div className="ghead" />
        {days.map((d) => (
          <div key={d} className={`ghead ${d === data.today ? 'today' : ''}`}>{fmtDate(d)}</div>
        ))}
        <div className="times">
          {Array.from({ length: (g1 - g0) / 60 }, (_, i) => (
            <div key={i} className="tslot">{fmtTime(g0 + i * 60)}</div>
          ))}
        </div>
        {days.map((d) => (
          <Col key={d} date={d} data={data} g0={g0} g1={g1} />
        ))}
      </div>
    </div>
  );
}

function Col({ date, data, g0, g1 }: { date: string; data: AgendaData; g0: number; g1: number }) {
  const { me, staff, openAppt, openBooking } = useApp();
  const hrs = data.hours[wday(date)];
  const free = freeSlots(date, data.hours, data.blocks, data.appts, data.today, data.now, data.groups);
  const fixed = data.blocks.filter((b) => b.weekday === wday(date));
  const dayAppts = data.appts.filter((a) => a.date === date);
  // groepen en afspraken samen in banen, zodat een afspraak tijdens een groep niet wegvalt (groep-id negatief)
  const evs = layoutDay<Appt | (GroupOcc & { grp: true })>([
    ...dayAppts,
    ...groupsOn(data.groups, date).map((g) => ({ ...g, id: -g.id, grp: true as const })),
  ]);
  const lanePos = (lane: number, lanes: number, span: number) => ({
    left: `calc(${(lane * 100) / lanes}% + ${lane ? 2 : 4}px)`,
    right: 'auto',
    width: `calc(${(100 * span) / lanes}% - 6px)`,
  });
  return (
    <div className="col" style={{ height: px(g1 - g0) }}>
      {!hrs && <div className="off" style={{ top: 0, height: '100%' }} />}
      {hrs && hrs[0] > g0 && <div className="off" style={{ top: 0, height: px(hrs[0] - g0) }} />}
      {hrs && hrs[1] < g1 && <div className="off" style={{ top: px(hrs[1] - g0), bottom: 0 }} />}
      {free.map((t) => (
        <button
          key={t}
          className="free"
          aria-label={`Vrij ${fmtDate(date)} ${fmtTime(t)}, inplannen`}
          style={{ top: `calc(${px(t - g0)} + 2px)`, height: 'calc(var(--slot) - 4px)' }}
          onClick={() => openBooking({ date, start: t })}
        />
      ))}
      {fixed.map((f, i) => (
        <div
          key={i}
          className={`ev blk ${f.title === 'Lunch' ? 'lunch' : ''}`}
          style={{ top: `calc(${px(f.start - g0)} + 1px)`, height: `calc(${px(f.dur)} - 3px)` }}
        >
          <b>{f.title}</b>
        </div>
      ))}
      {evs.map(({ a, lane, lanes, span }) => {
        if ('grp' in a) return <GroupEv key={a.id} g={{ ...a, id: -a.id }} g0={g0} pos={lanePos(lane, lanes, span)} />;
        const shared = overlapping(dayAppts, date, a.start, a.dur, a.id).length;
        return (
          <button
            key={a.id}
            className={`ev ${a.done ? 'done' : ''}`}
            data-id={a.id}
            onClick={() => openAppt(a.id)}
            title={`${a.name} · ${fmtTime(a.start)}–${fmtTime(a.start + a.dur)} · via ${staff[a.by]?.displayName ?? a.by}`}
            style={{
              ...cssVars({ '--c': `var(--s-${a.by})`, '--k': 'var(--k-training)' }),
              top: `calc(${px(a.start - g0)} + 1px)`,
              height: `calc(${px(a.dur)} - 3px)`,
              ...lanePos(lane, lanes, span),
            }}
          >
            {me.isOwner && !a.seen && a.by !== me.id && <i className="new" aria-label="Nieuw" />}
            <b>{a.name}</b>
            <span>
              {shared > 0 && (
                <em className="shared" title={`Tegelijk met ${shared} andere patiënt${shared > 1 ? 'en' : ''}`}>👥{shared + 1}</em>
              )}
              {fmtTime(a.start)} · <strong style={{ color: `var(--s-${a.by})` }}>{initials(staff[a.by]?.name ?? '')}</strong> {staff[a.by]?.displayName}
            </span>
          </button>
        );
      })}
      {date === data.today && data.now >= g0 && data.now <= g1 && <div className="nowline" style={{ top: px(data.now - g0) }} />}
    </div>
  );
}

function DayList({ date, data }: { date: string; data: AgendaData }) {
  const { me, staff, openAppt, openBooking, openGroup } = useApp();
  const hrs = data.hours[wday(date)];
  const groups = groupsOn(data.groups, date);
  if (!hrs && !groups.length) return <div className="empty">Joey werkt niet op {fmtLong(date)}.</div>;
  const rows: { t: number; key: string; el: JSX.Element }[] = [];
  groups.forEach((g) =>
    rows.push({
      t: g.start,
      key: 'g' + g.id,
      el: (
        <button className="drow dgrp" onClick={() => openGroup(g.id, g.date)} style={cssVars({ '--c': `var(--s-${g.owner})` })}>
          <div className="t">{fmtTime(g.start)}</div>
          <div className="c">
            <b>{g.title}</b>
            <small>
              {fmtTime(g.start)}–{fmtTime(g.start + g.dur)} · {everyLabel(g.every)}
            </small>
          </div>
          <div className="r">
            <Avatar id={g.owner} name={staff[g.owner]?.name ?? g.ownerName} size={22} />
            Groep {g.ownerName} · Joey neemt over
          </div>
        </button>
      ),
    }),
  );
  data.blocks
    .filter((f) => f.weekday === wday(date))
    .forEach((f, i) =>
      rows.push({
        t: f.start,
        key: 'b' + i,
        el: (
          <div className="drow doff" style={cssVars({ '--k': f.title === 'Lunch' ? 'transparent' : 'var(--k-groep)' })}>
            <div className="t">{fmtTime(f.start)}</div>
            <div className="c">
              <b>{f.title}</b>
              <small>{fmtTime(f.start)}–{fmtTime(f.start + f.dur)}</small>
            </div>
            <div className="r" />
          </div>
        ),
      }),
    );
  data.appts
    .filter((a) => a.date === date)
    .forEach((a: Appt) => {
      const sh = overlapping(data.appts, date, a.start, a.dur, a.id).length;
      rows.push({
        t: a.start,
        key: 'a' + a.id,
        el: (
          <button className="drow" data-id={a.id} onClick={() => openAppt(a.id)} style={cssVars({ '--c': `var(--s-${a.by})`, '--k': 'var(--k-training)' })}>
            <div className="t">{fmtTime(a.start)}</div>
            <div className="c">
              {me.isOwner && !a.seen && a.by !== me.id && (
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)', flex: 'none' }} aria-label="Nieuw" />
              )}
              <b>{a.name}</b>
              <small>
                {a.dur} min{a.hasPlan ? ' · oefenschema' : ''}
                {a.done ? ' · afgerond' : ''}
              </small>
            </div>
            <div className="r">
              {sh > 0 && <span className="shared" style={{ color: 'var(--warn)', fontWeight: 700 }}>👥 {sh + 1} tegelijk</span>}
              <strong style={{ color: `var(--s-${a.by})` }}>{initials(staff[a.by]?.name ?? '')}</strong>
              {staff[a.by]?.displayName}
            </div>
          </button>
        ),
      });
    });
  freeSlots(date, data.hours, data.blocks, data.appts, data.today, data.now, data.groups).forEach((t) =>
    rows.push({
      t,
      key: 'f' + t,
      el: (
        <button className="drow dfree" onClick={() => openBooking({ date, start: t })}>
          <div className="t">{fmtTime(t)}</div>
          <div className="c">+ vrij, inplannen</div>
          <div className="r" />
        </button>
      ),
    }),
  );
  rows.sort((a, b) => a.t - b.t);
  if (!rows.length) return <div className="empty">Niets gepland op {fmtLong(date)}.</div>;
  return (
    <div className="dlist">
      {rows.map((r) => (
        <Fragment key={r.key}>{r.el}</Fragment>
      ))}
    </div>
  );
}

