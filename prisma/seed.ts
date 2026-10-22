/* Seed: collega's, werktijden, vaste blokken en de voorbeelddata uit de demo.
   Afspraken worden in de huidige week gezet (demo-maandag 19 okt → maandag van deze week),
   zodat de agenda direct gevuld is. SEED_DEMO=0: alleen collega's, werktijden en vaste blokken.
   Alleen voor een lege database: draai `prisma migrate reset` om opnieuw te seeden. */

import { PrismaClient, type AppointmentKind } from '@prisma/client';
import { addDays, fmtDate, fmtTime, h, todayISO, toDbDate, weekStartOf } from '../lib/time';

const prisma = new PrismaClient();

const STAFF = [
  { id: 'joey', name: 'Joey Inge', displayName: 'Joey', roleLabel: 'Personal trainer', hue: 186, color: 'petrol', isOwner: true },
  { id: 'anouk', name: 'Anouk Zwarteveld', displayName: 'Anouk', roleLabel: 'Fysiotherapeut, bekkenfysiotherapeut', hue: 330, color: 'roze' },
  { id: 'diana', name: 'Diana Ketelaars', displayName: 'Diana', roleLabel: 'Praktijkmanager', hue: 215, color: 'blauw' },
  { id: 'guido', name: 'Guido de Rijk', displayName: 'Guido', roleLabel: 'Fysiotherapeut, oedeemfysiotherapeut', hue: 95, color: 'geel' },
  { id: 'jasper', name: 'Jasper de Koning', displayName: 'Jasper', roleLabel: 'Fysiotherapeut, manueel therapeut', hue: 12, color: 'rood' },
  { id: 'jeannette', name: 'Jeannette van Rooyen', displayName: 'Jeannette', roleLabel: 'Fysiotherapeut, manueel therapeut', hue: 280, color: 'paars' },
  { id: 'joeyve', name: 'Joey van Eeden', displayName: 'Joey v. Eeden', roleLabel: 'Fysiotherapeut, manueel therapeut i.o.', hue: 160, color: 'smaragd' },
  { id: 'joyce', name: 'Joyce Vermeulen', displayName: 'Joyce', roleLabel: 'Praktijkmanager', hue: 240, color: 'indigo' },
  { id: 'marloes', name: 'Marloes de Rijk', displayName: 'Marloes', roleLabel: 'Fysiotherapeut, kinderfysiotherapeut', hue: 300, color: 'magenta' },
  { id: 'maddy', name: 'Maddy de Jong', displayName: 'Maddy', roleLabel: 'Fysiotherapeut', hue: 350, color: 'bordeaux' },
  { id: 'martin', name: 'Martin Vermeulen', displayName: 'Martin', roleLabel: 'Fysiotherapeut, geriatriefysiotherapeut', hue: 265, color: 'bruin' },
  { id: 'perry', name: 'Perry Paauw', displayName: 'Perry', roleLabel: 'Fysiotherapeut', hue: 35, color: 'oranje' },
  { id: 'tessa', name: 'Tessa Fleury', displayName: 'Tessa', roleLabel: 'Fysiotherapeut, manueel therapeut', hue: 200, color: 'hemelsblauw' },
  { id: 'thomas', name: 'Thomas Eijgendaal', displayName: 'Thomas', roleLabel: 'Fysiotherapeut, psychosomatisch i.o.', hue: 55, color: 'limoen' },
  { id: 'viresh', name: 'Viresh Khoesial', displayName: 'Viresh', roleLabel: 'Fysiotherapeut, manueel therapeut', hue: 125, color: 'groen' },
];

// Joey: ma 10–18 (Uiterwaard), di 10–18:15, wo 10–16, do 10–18, vr 10–15, za 10–14
const HOURS = [
  { weekday: 1, startMinutes: h(10), endMinutes: h(18) },
  { weekday: 2, startMinutes: h(10), endMinutes: h(18, 15) },
  { weekday: 3, startMinutes: h(10), endMinutes: h(16) },
  { weekday: 4, startMinutes: h(10), endMinutes: h(18) },
  { weekday: 5, startMinutes: h(10), endMinutes: h(15) },
  { weekday: 6, startMinutes: h(10), endMinutes: h(14) },
];

// lessen die Joey geeft: hierin kan niemand inplannen
const BLOCKS = [
  { weekday: 1, startMinutes: h(16), durationMinutes: 120, title: 'Groepsles · Uiterwaard' },
  { weekday: 2, startMinutes: h(16), durationMinutes: 135, title: 'Groepsles' },
  { weekday: 3, startMinutes: h(10), durationMinutes: 120, title: 'Groepsles' },
  { weekday: 3, startMinutes: h(14), durationMinutes: 120, title: 'Groepsles' },
  { weekday: 4, startMinutes: h(16), durationMinutes: 120, title: 'Groepsles' },
  { weekday: 5, startMinutes: h(14), durationMinutes: 60, title: 'Groepsles' },
  { weekday: 6, startMinutes: h(10), durationMinutes: 240, title: 'Groepsles' },
];

const PATIENTS = [
  { key: 1, name: 'Henk de Vries', birthYear: 1951, goal: 'Weer zelfstandig fietsen naar de markt', complaint: 'Na knieprothese rechts', notes: 'Kniebuiging nog max. ~100°. Geen diepe squats.' },
  { key: 2, name: 'Ria Bakker', birthYear: 1946, goal: 'Valrisico verlagen', complaint: 'Verminderde balans', notes: 'Liever ochtendafspraken.' },
  { key: 3, name: 'Mohamed El Amrani', birthYear: 1979, goal: 'Terug naar werk in de bouw', complaint: 'Lage rugklachten', notes: '' },
  { key: 4, name: 'Els van Dijk', birthYear: 1958, goal: 'Arm weer boven hoofd', complaint: 'Frozen shoulder links', notes: '' },
  { key: 5, name: 'Piet Jansen', birthYear: 1948, goal: 'Conditie behouden', complaint: 'Na hartrevalidatie', notes: 'Hartslag max. 120.' },
  { key: 6, name: 'Bob Smit', birthYear: 1963, goal: 'Sterker bovenbeen na meniscusoperatie', complaint: 'Meniscus links, 8 weken post-op', notes: '' },
];

type Ex = [name: string, sets: number | string, reps: number | string, load: string];
type DemoAppt = {
  key: number; kind?: AppointmentKind; p: number | null; newName?: string; day: number; start: number; dur: number;
  by: string; todo: string; ex: Ex[]; seen: boolean; paste?: string;
};

// day = dagen na maandag van deze week (demo: 19 okt = 0)
const APPTS: DemoAppt[] = [
  { key: 1, p: 1, day: 0, start: h(10), dur: 45, by: 'martin', todo: 'Opstaan uit stoel en traplopen. Knie max. 100° buigen.', ex: [['Sit-to-stand', 3, 10, 'stoel 46 cm'], ['Step-up', 3, 8, '20 cm, per been']], seen: true },
  { key: 2, p: 2, day: 0, start: h(11), dur: 45, by: 'jasper', todo: 'Balans en loopzekerheid.', ex: [['Tandemstand', 3, '30 s', 'naast wand'], ['Zijwaarts stappen met band', 3, 10, '']], seen: true },
  { key: 3, p: 3, day: 1, start: h(10), dur: 60, by: 'joey', todo: 'Krachttraining week 4.', ex: [['Trap bar deadlift', 4, 6, '60 kg'], ['Kabel roeien', 3, 12, '30 kg']], seen: true },
  { key: 4, p: 1, day: 1, start: h(11), dur: 45, by: 'martin', todo: 'Zelfde als maandag, step-up naar 25 cm als het goed gaat.', ex: [['Sit-to-stand', 3, 10, ''], ['Step-up', 3, 8, '25 cm']], seen: true },
  { key: 5, p: 6, day: 1, start: h(14), dur: 45, by: 'jasper', todo: 'Eerste training na meniscus. Focus op quadriceps, rustig opbouwen. Geen draaibewegingen.', ex: [['Leg extension', 3, 15, 'licht, pijnvrij'], ['Leg press', 3, 12, '30 kg'], ['Hometrainer', 1, '10 min', 'warming-up']], seen: false },
  { key: 6, p: 5, day: 2, start: h(13), dur: 45, by: 'joey', todo: 'Conditie.', ex: [['Loopband', 1, '15 min', '4,5 km/u'], ['Leg press', 3, 12, '40 kg']], seen: true },
  { key: 7, p: 4, day: 3, start: h(10), dur: 30, by: 'jasper', todo: 'Schouderstabiliteit opbouwen. Exorotatie vindt ze nog lastig.', ex: [], seen: false,
    paste: 'Oefenprogramma - E. van Dijk\n\n1. Exorotatie schouder met elastiek (geel)\n   3 x 15, langzaam terug\n2. Wall slides\n   3 x 10\n3. Pendeloefening\n   2 x 30 sec\n\nBij pijn > 4/10 gewicht/weerstand terug.' },
  { key: 8, p: 2, day: 3, start: h(11), dur: 45, by: 'diana', todo: 'Vervolgafspraak op verzoek van patiënt.', ex: [], seen: true },
  { key: 9, p: 3, day: 4, start: h(10), dur: 60, by: 'joey', todo: 'Krachttraining week 4.', ex: [['Trap bar deadlift', 4, 6, '62,5 kg']], seen: true },
  { key: 10, p: 6, day: 8, start: h(14), dur: 45, by: 'jasper', todo: 'Vervolg Bob. Leg extension 3×15, gewicht iets omhoog als het pijnvrij was.', ex: [['Leg extension', 3, 15, '+2,5 kg'], ['Leg press', 3, 12, '35 kg']], seen: false },
  { key: 11, p: null, newName: 'Wim Kuipers', day: 2, start: h(12), dur: 60, by: 'diana', todo: 'Nieuwe aanmelding via huisarts, 72 jaar. Wil sterker worden voor het fietsen. Intake graag. Tel: 06 40 50 60 70', ex: [], seen: false },
  { key: 12, p: 5, day: 1, start: h(11), dur: 45, by: 'joeyve', todo: 'Piet mag aansluiten bij de training van Henk. Conditie op de hometrainer, hartslag max. 120.', ex: [['Hometrainer', 1, '20 min', 'HF max 120'], ['Chest press', 3, 12, '15 kg']], seen: false },
];

// Meldingen uit de demo. Tijd = minuten vóór "nu" (demo-nu: di 20 okt 10:55).
type DemoLog = { who: string; act: 'ADD' | 'EDIT'; appt: number; ago: number; read: boolean; note?: string };
const D = 24 * 60;
const LOG: DemoLog[] = [
  { who: 'martin', act: 'ADD', appt: 1, ago: 5 * D - h(3, 7), read: true }, // 15 okt 14:02
  { who: 'diana', act: 'ADD', appt: 8, ago: 4 * D - h(0, 25), read: true }, // 16 okt 11:20
  { who: 'martin', act: 'ADD', appt: 4, ago: 3 * D + h(1, 45), read: true }, // 17 okt 09:10
  { who: 'jasper', act: 'ADD', appt: 2, ago: 3 * D, read: true },
  { who: 'jasper', act: 'ADD', appt: 5, ago: D - h(5, 47), read: false }, // 19 okt 16:42
  { who: 'jasper', act: 'ADD', appt: 10, ago: D - h(5, 49), read: false }, // 19 okt 16:44
  { who: 'jasper', act: 'ADD', appt: 7, ago: h(2, 50), read: false }, // 08:05
  { who: 'diana', act: 'ADD', appt: 11, ago: h(1, 24), read: false }, // 09:31
  { who: 'martin', act: 'EDIT', appt: 4, ago: h(1, 5), read: false, note: 'instructie aangepast' }, // 09:50
  { who: 'joeyve', act: 'ADD', appt: 12, ago: 43, read: false, note: 'tegelijk met Henk de Vries' }, // 10:12
  { who: 'joey', act: 'ADD', appt: 3, ago: 6 * D, read: true },
  { who: 'joey', act: 'ADD', appt: 6, ago: 6 * D, read: true },
  { who: 'joey', act: 'ADD', appt: 9, ago: 6 * D, read: true },
];

async function main() {
  if (await prisma.user.count()) {
    console.log('Database bevat al gegevens, seed overgeslagen. Gebruik `npx prisma migrate reset` om opnieuw te beginnen.');
    return;
  }

  await prisma.user.createMany({ data: STAFF });
  await prisma.workingHours.createMany({ data: HOURS });
  await prisma.fixedBlock.createMany({ data: BLOCKS });

  if (process.env.SEED_DEMO === '0') {
    console.log(`Seed klaar zonder voorbeelddata: ${STAFF.length} collega's, werktijden en vaste blokken.`);
    return;
  }

  const pid = new Map<number, { id: number; name: string }>();
  for (const { key, ...p } of PATIENTS) {
    const row = await prisma.patient.create({ data: { ...p, notes: p.notes || null, createdById: 'diana' } });
    pid.set(key, { id: row.id, name: row.name });
  }

  const monday = weekStartOf(todayISO());
  const now = Date.now();
  const firstLog = (key: number) => LOG.filter((l) => l.appt === key).sort((a, b) => b.ago - a.ago)[0];

  const aid = new Map<number, { id: number; date: string; start: number; name: string }>();
  for (const a of APPTS) {
    const date = addDays(monday, a.day);
    const created = new Date(now - (firstLog(a.key)?.ago ?? 7 * D) * 60_000);
    const name = a.p ? pid.get(a.p)!.name : a.newName!;
    const row = await prisma.appointment.create({
      data: {
        patientId: a.p ? pid.get(a.p)!.id : null,
        newPatientName: a.newName ?? null,
        date: toDbDate(date),
        startMinutes: a.start,
        durationMinutes: a.dur,
        kind: a.kind ?? 'TRAINING',
        instruction: a.todo,
        pastedPlan: a.paste ?? '',
        seenByOwner: a.seen,
        createdById: a.by,
        updatedById: a.by,
        createdAt: created,
        exercises: {
          create: a.ex.map(([n, s, r, l], order) => ({ order, name: n, sets: String(s), reps: String(r), load: l })),
        },
      },
    });
    aid.set(a.key, { id: row.id, date, start: a.start, name });
  }

  await prisma.activityLog.createMany({
    data: LOG.map((l) => {
      const a = aid.get(l.appt)!;
      return {
        actorId: l.who,
        action: l.act,
        appointmentId: a.id,
        patientNameSnapshot: a.name,
        dateSnapshot: toDbDate(a.date),
        startSnapshot: a.start,
        note: l.note ?? null,
        createdAt: new Date(now - l.ago * 60_000),
        readByOwner: l.read,
      };
    }),
  });

  // groep van Guido die Joey op maandag overneemt
  await prisma.groupTakeover.create({
    data: { ownerId: 'guido', title: 'Groepsles', startDate: toDbDate(monday), everyWeeks: 1, startMinutes: h(11), durationMinutes: 120, createdById: 'joey' },
  });

  console.log(`Seed klaar: ${STAFF.length} collega's, ${PATIENTS.length} patiënten, ${APPTS.length} afspraken (week van ${fmtDate(monday)}), ${LOG.length} meldingen, 1 overgenomen groep.`);
  console.log(`Eerste afspraak: ${fmtDate(monday)} ${fmtTime(h(9))}. Inloggen met de pincode uit APP_PIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
