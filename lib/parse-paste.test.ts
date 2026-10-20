import { describe, expect, it } from 'vitest';
import { parsePaste } from './parse-paste';

describe('parsePaste', () => {
  it('herkent "naam 3x15"', () => {
    expect(parsePaste('Leg extension 3x15')).toEqual([{ name: 'Leg extension', sets: '3', reps: '15', load: '' }]);
  });

  it('herkent × met spaties en belasting erachter', () => {
    expect(parsePaste('Leg extension 3 × 15 10 kg')).toEqual([{ name: 'Leg extension', sets: '3', reps: '15', load: '10 kg' }]);
  });

  it('haalt nummering en opsommingstekens weg', () => {
    expect(parsePaste('1. Squat 3x10\n2) Lunges 2 x 12\n- Plank 3x30s\n• Brug 2x15, langzaam\n* Step-up 3x8 per been')).toEqual([
      { name: 'Squat', sets: '3', reps: '10', load: '' },
      { name: 'Lunges', sets: '2', reps: '12', load: '' },
      { name: 'Plank', sets: '3', reps: '30s', load: '' },
      { name: 'Brug', sets: '2', reps: '15', load: 'langzaam' },
      { name: 'Step-up', sets: '3', reps: '8', load: 'per been' },
    ]);
  });

  it('koppelt een losse "3 x 15"-regel aan de naam erboven', () => {
    expect(parsePaste('Wall slides\n   3 x 10')).toEqual([{ name: 'Wall slides', sets: '3', reps: '10', load: '' }]);
  });

  it('herkent tijd- en afstandseenheden', () => {
    const r = parsePaste('Pendel 2 x 30 sec\nFietsen 1x10 min\nWandelen 2x20m\nRoeien 1 x 500 meter\nZijplank 3x45 s');
    expect(r.map((e) => e.reps)).toEqual(['30 sec', '10 min', '20m', '500 meter', '45 s']);
  });

  it('herkent een bereik als reps', () => {
    expect(parsePaste('Chest press 3x10-12 20 kg')).toEqual([{ name: 'Chest press', sets: '3', reps: '10-12', load: '20 kg' }]);
    expect(parsePaste('Roeien 3 x 8 – 10')[0].reps).toBe('8–10');
  });

  it('negeert regels zonder sets × reps', () => {
    expect(parsePaste('Oefenprogramma - E. van Dijk\n\nBij pijn > 4/10 gewicht/weerstand terug.')).toEqual([]);
    expect(parsePaste('')).toEqual([]);
  });

  it('verwerkt het voorbeeld uit de demo', () => {
    const txt =
      'Oefenprogramma - E. van Dijk\n\n1. Exorotatie schouder met elastiek (geel)\n   3 x 15, langzaam terug\n2. Wall slides\n   3 x 10\n3. Pendeloefening\n   2 x 30 sec\n\nBij pijn > 4/10 gewicht/weerstand terug.';
    expect(parsePaste(txt)).toEqual([
      { name: 'Exorotatie schouder met elastiek (geel)', sets: '3', reps: '15', load: 'langzaam terug' },
      { name: 'Wall slides', sets: '3', reps: '10', load: '' },
      { name: 'Pendeloefening', sets: '2', reps: '30 sec', load: '' },
    ]);
  });

  it('kan tegen rommelige opmaak (Windows-regeleindes, dubbele spaties, dubbele punt)', () => {
    const txt = 'OEFENINGEN:\r\n\r\nSquat tegen bal:\r\n\t3  x  12\r\nHeup abductie lig  -  2X15  links en rechts\r\nOpmerking: rustig opbouwen';
    expect(parsePaste(txt)).toEqual([
      { name: 'Squat tegen bal', sets: '3', reps: '12', load: '' },
      { name: 'Heup abductie lig', sets: '2', reps: '15', load: 'links en rechts' },
    ]);
  });
});
