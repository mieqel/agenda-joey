import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { idParam, withUser } from '@/lib/api';
import { ChangeError } from '@/lib/appointments';
import { fromDbDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (_user, _req, ctx) => {
  const p = await prisma.patient.findUnique({
    where: { id: idParam(ctx) },
    include: {
      appointments: {
        where: { deletedAt: null },
        orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
        include: { exercises: { orderBy: { order: 'asc' } }, createdBy: { select: { id: true, displayName: true } } },
      },
    },
  });
  if (!p) throw new ChangeError('Patiënt niet gevonden.', 404);
  const { appointments, ...facts } = p;
  return NextResponse.json({
    ...facts,
    appointments: appointments.map((a) => ({
      id: a.id,
      date: fromDbDate(a.date),
      start: a.startMinutes,
      instruction: a.instruction,
      pastedPlan: a.pastedPlan,
      done: a.done,
      by: a.createdBy.id,
      byName: a.createdBy.displayName,
      exercises: a.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, load: e.load })),
    })),
  });
});

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);
const schema = z.object({
  name: z.string().trim().min(2, 'Vul een naam in.').max(120),
  birthYear: z.number().int().min(1900).max(2100).nullable(),
  goal: opt(500),
  complaint: opt(500),
  notes: opt(2000),
});

/** Alleen Joey: patiëntgegevens aanpassen. */
export const PATCH = withUser(
  async (_user, req, ctx) => {
    const data = schema.parse(await req.json());
    await prisma.patient.update({ where: { id: idParam(ctx) }, data });
    return NextResponse.json({ ok: true });
  },
  { owner: true },
);
