import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { idParam, withUser } from '@/lib/api';
import { apptsOn, ChangeError, changeAppointments, editSchema, patientName } from '@/lib/appointments';
import { overlapping } from '@/lib/schedule';
import { fromDbDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (_user, _req, ctx) => {
  const a = await prisma.appointment.findFirst({
    where: { id: idParam(ctx), deletedAt: null },
    include: {
      patient: true,
      createdBy: { select: { id: true, name: true, roleLabel: true } },
      exercises: { orderBy: { order: 'asc' } },
      activity: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, displayName: true } } } },
    },
  });
  if (!a) throw new ChangeError('Deze afspraak bestaat niet meer.', 404);
  const date = fromDbDate(a.date);
  const [sameDay, others] = await Promise.all([
    apptsOn([date]),
    a.patientId
      ? prisma.appointment.findMany({
          where: { patientId: a.patientId, deletedAt: null, id: { not: a.id } },
          include: { createdBy: { select: { displayName: true } } },
          orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
        })
      : [],
  ]);
  return NextResponse.json({
    id: a.id,
    date,
    start: a.startMinutes,
    dur: a.durationMinutes,
    kind: a.kind.toLowerCase(),
    name: patientName(a),
    patient: a.patient,
    newPatientName: a.newPatientName,
    instruction: a.instruction,
    pastedPlan: a.pastedPlan,
    done: a.done,
    seen: a.seenByOwner,
    by: a.createdBy,
    exercises: a.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, load: e.load })),
    history: a.activity.map((l) => ({
      id: l.id,
      who: l.actor.id,
      whoName: l.actor.displayName,
      action: l.action,
      note: l.note,
      from: l.fromSnapshot,
      at: l.createdAt,
    })),
    together: overlapping(sameDay, date, a.startMinutes, a.durationMinutes, a.id),
    others: others.map((o) => ({ id: o.id, date: fromDbDate(o.date), start: o.startMinutes, byName: o.createdBy.displayName })),
  });
});

export const PATCH = withUser(async (user, req, ctx) => {
  const input = editSchema.parse(await req.json());
  return NextResponse.json(await changeAppointments(user, { op: 'edit', id: idParam(ctx), input }));
});

export const DELETE = withUser(async (user, _req, ctx) =>
  NextResponse.json(await changeAppointments(user, { op: 'delete', id: idParam(ctx) })),
);
