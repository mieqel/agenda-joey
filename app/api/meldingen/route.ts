import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';
import { fromDbDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Alleen Joey: alles wat collega's in zijn agenda deden. */
export const GET = withUser(
  async () => {
    const rows = await prisma.activityLog.findMany({
      where: { actor: { isOwner: false } },
      include: { actor: { select: { id: true, name: true } }, appointment: { select: { deletedAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(
      rows.map((l) => ({
        id: l.id,
        who: l.actor.id,
        whoName: l.actor.name,
        action: l.action,
        appt: l.appointmentId,
        exists: !l.appointment.deletedAt,
        pname: l.patientNameSnapshot,
        date: fromDbDate(l.dateSnapshot),
        start: l.startSnapshot,
        from: l.fromSnapshot,
        note: l.note,
        at: l.createdAt,
        read: l.readByOwner,
      })),
    );
  },
  { owner: true },
);
