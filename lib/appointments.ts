/* Alle wijzigingen aan afspraken lopen via changeAppointments(): valideert opnieuw op de server
   en schrijft de ActivityLog in dezelfde transactie. */

import type { Appointment, AppointmentKind, Patient, User } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './db';
import { addDays, fmtDate, fmtTime, fromDbDate, toDbDate } from './time';
import { conflictReason, listNames, overlapping, type Block, type Hours, type Timed } from './schedule';
import { ChangeError } from './errors';
import { loadGroups } from './groups';

export { ChangeError };

/* ---------- regels uit de database ---------- */

export async function loadRules() {
  const [h, b, groups] = await Promise.all([
    prisma.workingHours.findMany(),
    prisma.fixedBlock.findMany({ orderBy: { startMinutes: 'asc' } }),
    loadGroups(),
  ]);
  const hours: Hours = Object.fromEntries(h.map((x) => [x.weekday, [x.startMinutes, x.endMinutes]]));
  const blocks: Block[] = b.map((x) => ({ weekday: x.weekday, start: x.startMinutes, dur: x.durationMinutes, title: x.title }));
  return { hours, blocks, groups };
}

/** Datums van een reeks: elke `every` weken, `times` keer. */
export const seriesDates = (date: string, times: number, every: number) =>
  Array.from({ length: times }, (_, i) => addDays(date, 7 * every * i));

export const patientName = (a: { patient?: Pick<Patient, 'name'> | null; newPatientName?: string | null }) =>
  a.patient?.name ?? a.newPatientName ?? '—';

export type Lite = Timed & { name: string; by: string; byName: string };

/** Niet-verwijderde afspraken op deze datums, compact. */
export async function apptsOn(dates: string[]): Promise<Lite[]> {
  const rows = await prisma.appointment.findMany({
    where: { date: { in: dates.map(toDbDate) }, deletedAt: null },
    include: { patient: { select: { name: true } }, createdBy: { select: { displayName: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    date: fromDbDate(a.date),
    start: a.startMinutes,
    dur: a.durationMinutes,
    name: patientName(a),
    by: a.createdById,
    byName: a.createdBy.displayName,
  }));
}

/** Per datum: kan het (err) en wie is er dan al (with). */
export async function checkSlots(dates: string[], start: number, dur: number, ignoreId?: number) {
  const [{ hours, blocks, groups }, appts] = await Promise.all([loadRules(), apptsOn(dates)]);
  return dates.map((date) => {
    const err = conflictReason(date, start, dur, hours, blocks, groups);
    return { date, err, with: err ? [] : overlapping(appts, date, start, dur, ignoreId) };
  });
}

/* ---------- invoer ---------- */

const exercise = z.object({
  name: z.string().trim().max(200),
  sets: z.coerce.string().trim().max(20),
  reps: z.coerce.string().trim().max(20),
  load: z.string().trim().max(200).default(''),
});
const base = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(0).max(24 * 60 - 15).refine((v) => v % 15 === 0),
  dur: z.union([z.literal(30), z.literal(60)]),
  kind: z.enum(['training', 'intake', 'controle']),
  instruction: z.string().trim().max(5000).default(''),
  pastedPlan: z.string().trim().max(20000).default(''),
  exercises: z.array(exercise).max(50).default([]),
};
export const createSchema = z
  .object({
    ...base,
    repeat: z.number().int().min(1).max(12).default(1), // aantal keer
    every: z.number().int().min(1).max(4).default(1), // om de hoeveel weken
    patientId: z.number().int().nullable().default(null),
    newPatientName: z.string().trim().max(120).nullable().default(null),
  })
  .refine((v) => v.patientId || v.newPatientName, { message: 'Kies een patiënt of vul een naam in.' });
// 45 min alleen nog voor bestaande afspraken van vóór de keuze 30/60
export const editSchema = z.object({ ...base, dur: z.union([z.literal(30), z.literal(45), z.literal(60)]) });

type CreateInput = z.infer<typeof createSchema>;
type EditInput = z.infer<typeof editSchema>;

const toKind = (k: EditInput['kind']) => k.toUpperCase() as AppointmentKind;
const cleanExercises = (ex: EditInput['exercises']) =>
  ex.filter((e) => e.name).map((e, order) => ({ order, name: e.name, sets: e.sets, reps: e.reps, load: e.load }));
const togetherNote = (w: Lite[]) => (w.length ? 'tegelijk met ' + listNames(w.map((x) => x.name)) : null);

/* ---------- de ene schrijffunctie ---------- */

type Change = { op: 'add'; input: CreateInput } | { op: 'edit'; id: number; input: EditInput } | { op: 'delete'; id: number };

export async function changeAppointments(actor: User, change: Change) {
  const read = actor.isOwner; // eigen wijzigingen van Joey zijn meteen "gelezen"

  if (change.op === 'add') {
    const v = change.input;
    const dates = seriesDates(v.date, v.repeat, v.every);
    const checks = await checkSlots(dates, v.start, v.dur);
    const ok = checks.filter((c) => !c.err);
    if (!ok.length) throw new ChangeError(checks[0].err!);

    let name = v.newPatientName ?? '';
    if (v.patientId) {
      const p = await prisma.patient.findUnique({ where: { id: v.patientId } });
      if (!p) throw new ChangeError('Patiënt bestaat niet (meer).');
      name = p.name;
    }
    const exercises = cleanExercises(v.exercises);

    const created = await prisma.$transaction(async (tx) => {
      const out: { id: number; date: string }[] = [];
      for (const c of ok) {
        const a = await tx.appointment.create({
          data: {
            patientId: v.patientId,
            newPatientName: v.patientId ? null : name,
            date: toDbDate(c.date),
            startMinutes: v.start,
            durationMinutes: v.dur,
            kind: toKind(v.kind),
            instruction: v.instruction,
            pastedPlan: v.pastedPlan,
            seenByOwner: read,
            createdById: actor.id,
            updatedById: actor.id,
            exercises: { create: exercises },
          },
        });
        await tx.activityLog.create({
          data: {
            actorId: actor.id, action: 'ADD', appointmentId: a.id, patientNameSnapshot: name,
            dateSnapshot: a.date, startSnapshot: v.start, note: togetherNote(c.with), readByOwner: read,
          },
        });
        out.push({ id: a.id, date: c.date });
      }
      return out;
    });
    return { created, skipped: checks.filter((c) => c.err).map((c) => c.date), name };
  }

  const existing = await prisma.appointment.findFirst({ where: { id: change.id, deletedAt: null }, include: { patient: true } });
  if (!existing) throw new ChangeError('Deze afspraak bestaat niet meer.', 404);
  const name = patientName(existing);

  if (change.op === 'delete') {
    await prisma.$transaction([
      prisma.appointment.update({ where: { id: existing.id }, data: { deletedAt: new Date(), updatedById: actor.id } }),
      prisma.activityLog.create({
        data: {
          actorId: actor.id, action: 'DELETE', appointmentId: existing.id, patientNameSnapshot: name,
          dateSnapshot: existing.date, startSnapshot: existing.startMinutes, readByOwner: read,
        },
      }),
    ]);
    return { deleted: existing.id };
  }

  const v = change.input;
  const [check] = await checkSlots([v.date], v.start, v.dur, existing.id);
  if (check.err) throw new ChangeError(check.err);
  const oldDate = fromDbDate(existing.date);
  const moved = oldDate !== v.date || existing.startMinutes !== v.start;

  await prisma.$transaction([
    prisma.exercise.deleteMany({ where: { appointmentId: existing.id } }),
    prisma.appointment.update({
      where: { id: existing.id },
      data: {
        date: toDbDate(v.date), startMinutes: v.start, durationMinutes: v.dur, kind: toKind(v.kind),
        instruction: v.instruction, pastedPlan: v.pastedPlan, seenByOwner: read, updatedById: actor.id,
        exercises: { create: cleanExercises(v.exercises) },
      },
    }),
    prisma.activityLog.create({
      data: {
        actorId: actor.id, action: moved ? 'MOVE' : 'EDIT', appointmentId: existing.id, patientNameSnapshot: name,
        dateSnapshot: toDbDate(v.date), startSnapshot: v.start,
        fromSnapshot: moved ? `${fmtDate(oldDate)} ${fmtTime(existing.startMinutes)}` : null,
        note: togetherNote(check.with), readByOwner: read,
      },
    }),
  ]);
  return { updated: existing.id };
}

/* ---------- naar de browser ---------- */

export function toClient(a: Appointment & { patient: Pick<Patient, 'name'> | null; _count?: { exercises: number } }) {
  return {
    id: a.id,
    patientId: a.patientId,
    name: patientName(a),
    date: fromDbDate(a.date),
    start: a.startMinutes,
    dur: a.durationMinutes,
    kind: a.kind.toLowerCase() as 'training' | 'intake' | 'controle',
    by: a.createdById,
    hasPlan: (a._count?.exercises ?? 0) > 0 || !!a.pastedPlan,
    done: a.done,
    seen: a.seenByOwner,
  };
}
export type ClientAppt = ReturnType<typeof toClient>;
