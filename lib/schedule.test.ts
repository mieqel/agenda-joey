import { describe, expect, it } from 'vitest';
import { conflictReason, freeSlots, gridBounds, groupOn, layoutDay, listNames, nextDates, overlapping, type Block, type GroupRule, type Hours } from './schedule';

const H = (hh: number, mm = 0) => hh * 60 + mm;
const hours: Hours = { 1: [H(8), H(17)], 2: [H(8), H(17)], 3: [H(8), H(12, 30)], 4: [H(8), H(17)], 5: [H(8), H(13)] };
const blocks: Block[] = [
  { weekday: 1, start: H(14), dur: 60, title: 'Groepsles senioren' },
  { weekday: 2, start: H(12, 30), dur: 30, title: 'Lunch' },
];
// 2026-10-19 = maandag
const MA = '2026-10-19', DI = '2026-10-20', WO = '2026-10-21', ZA = '2026-10-24';

describe('conflictReason', () => {
  it('weekend: werkt niet', () => expect(conflictReason(ZA, H(9), 30, hours, blocks)).toBe('Joey werkt niet op deze dag.'));
  it('buiten werktijd', () => expect(conflictReason(WO, H(12), 45, hours, blocks)).toMatch(/^Buiten werktijd\. Joey werkt woensdag 21 okt van 08:00 tot 12:30/));
  it('tijdens vast blok', () => expect(conflictReason(MA, H(13, 30), 45, hours, blocks)).toBe('Joey heeft dan groepsles senioren (14:00–15:00).'));
  it('aansluitend op blok mag', () => expect(conflictReason(MA, H(15), 30, hours, blocks)).toBeNull());
  it('vrij', () => expect(conflictReason(DI, H(9), 60, hours, blocks)).toBeNull());
});

describe('overlapping & freeSlots', () => {
  const appts = [
    { id: 1, date: DI, start: H(9), dur: 45 },
    { id: 2, date: DI, start: H(11), dur: 45 },
  ];
  it('vindt overlap, negeert eigen afspraak', () => {
    expect(overlapping(appts, DI, H(9, 30), 30).map((a) => a.id)).toEqual([1]);
    expect(overlapping(appts, DI, H(9, 30), 30, 1)).toEqual([]);
    expect(overlapping(appts, DI, H(9, 45), 30)).toEqual([]);
  });
  it('vandaag alleen vakken vanaf nu, zonder lunch en afspraken', () => {
    const f = freeSlots(DI, hours, blocks, appts, DI, H(10, 30));
    expect(f).not.toContain(H(10));
    expect(f).not.toContain(H(11));
    expect(f).not.toContain(H(11, 30));
    expect(f).not.toContain(H(12, 30));
    expect(f[0]).toBe(H(10, 30));
    expect(f).toContain(H(16, 30));
  });
  it('geen vakken in het verleden', () => expect(freeSlots(MA, hours, blocks, [], DI, 0)).toEqual([]));
});

describe('layoutDay', () => {
  it('zet overlappende afspraken naast elkaar', () => {
    const r = layoutDay([
      { id: 1, date: DI, start: H(11), dur: 45 },
      { id: 2, date: DI, start: H(11), dur: 45 },
      { id: 3, date: DI, start: H(14), dur: 45 },
    ]);
    const byId = Object.fromEntries(r.map((o) => [o.a.id, o]));
    expect(byId[1].lanes).toBe(2);
    expect(new Set([byId[1].lane, byId[2].lane])).toEqual(new Set([0, 1]));
    expect(byId[1].shared).toBe(1);
    expect(byId[3]).toMatchObject({ lanes: 1, lane: 0, shared: 0 });
  });
});

describe('overig', () => {
  it('gridBounds', () => expect(gridBounds(hours)).toEqual([H(8), H(17)]));
  it('gridBounds verbreedt bij langere werktijd', () => expect(gridBounds({ 1: [H(7, 30), H(18, 15)] })).toEqual([H(7), H(19)]));
  it('gridBounds volgt Joey’s werktijden en verbreedt voor afspraken erbuiten', () => {
    const joey: Hours = { 1: [H(10), H(18)], 2: [H(10), H(18, 15)], 6: [H(10), H(14)] };
    expect(gridBounds(joey)).toEqual([H(10), H(19)]);
    expect(gridBounds(joey, [{ start: H(8, 30), dur: 60 }])).toEqual([H(8), H(19)]);
  });
  it('zaterdag: hele dag les = geen vrije vakken, wel een duidelijke reden', () => {
    const hrs: Hours = { 6: [H(10), H(14)] };
    const les: Block[] = [{ weekday: 6, start: H(10), dur: 240, title: 'Groepsles' }];
    expect(freeSlots('2026-10-24', hrs, les, [], '2026-10-20', 0)).toEqual([]);
    expect(conflictReason('2026-10-24', H(11), 45, hrs, les)).toBe('Joey heeft dan groepsles (10:00–14:00).');
  });
  it('listNames', () => {
    expect(listNames(['Henk'])).toBe('Henk');
    expect(listNames(['Henk', 'Ria', 'Piet'])).toBe('Henk, Ria en Piet');
  });
});

describe('overgenomen groepen', () => {
  const guido: GroupRule = {
    id: 1, title: 'Groepsles', owner: 'guido', ownerName: 'Guido', start: H(11), dur: 120,
    startDate: MA, endDate: null, every: 1, skip: [], note: '',
  };
  it('elke week op de weekdag van de eerste keer', () => {
    expect(groupOn(guido, MA)).toBe(true);
    expect(groupOn(guido, '2026-10-26')).toBe(true);
    expect(groupOn(guido, DI)).toBe(false);
    expect(groupOn(guido, '2026-10-12')).toBe(false); // vóór de eerste keer
  });
  it('om de week, overslaan en einddatum', () => {
    const g = { ...guido, every: 2, skip: ['2026-11-02'], endDate: '2026-11-30' };
    expect(nextDates(g, MA, 10)).toEqual(['2026-10-19', '2026-11-16', '2026-11-30']);
    expect(nextDates(g, '2026-10-20', 1)).toEqual(['2026-11-16']);
  });
  it('blokkeert inplannen, met naam van de collega', () => {
    expect(conflictReason(MA, H(12), 30, hours, blocks, [guido])).toBe('Joey neemt dan de groep van Guido over (11:00–13:00).');
    expect(conflictReason(MA, H(13), 30, hours, blocks, [guido])).toBeNull();
    expect(freeSlots(MA, hours, blocks, [], MA, 0, [guido])).not.toContain(H(11, 30));
  });
});

describe('layoutDay span', () => {
  it('afspraak wordt breder als de baan ernaast op dat moment vrij is', () => {
    const r = layoutDay([
      { id: 1, date: DI, start: H(10), dur: 45 },
      { id: 2, date: DI, start: H(10, 30), dur: 30 },
      { id: 3, date: DI, start: H(11), dur: 30 },
      { id: 4, date: DI, start: H(11), dur: 30 },
    ]);
    const byId = Object.fromEntries(r.map((o) => [o.a.id, o]));
    expect(byId[1]).toMatchObject({ lane: 0, lanes: 2, span: 1 }); // naast 2
    expect(byId[2]).toMatchObject({ lane: 1, span: 1 });
    expect(byId[3].lanes).toBe(2);
  });
  it('alleen in een rustige baan: volle breedte', () => {
    const r = layoutDay([
      { id: 1, date: DI, start: H(10), dur: 30 },
      { id: 2, date: DI, start: H(10, 15), dur: 60 },
      { id: 3, date: DI, start: H(10, 15), dur: 30 },
      { id: 4, date: DI, start: H(11), dur: 15 },
    ]);
    const byId = Object.fromEntries(r.map((o) => [o.a.id, o]));
    expect(byId[1].lanes).toBe(3);
    expect(byId[4]).toMatchObject({ lane: 0, span: 1 }); // id 2 loopt nog in baan 1
  });
});
