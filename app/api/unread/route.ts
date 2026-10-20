import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';
import { fromDbDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Badge + banner: aantal ongelezen meldingen en de laatste. Voor collega's altijd 0. */
export const GET = withUser(async (user) => {
  if (!user.isOwner) return NextResponse.json({ count: 0, latest: null });
  const where = { readByOwner: false, actor: { isOwner: false } };
  const [count, l] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findFirst({ where, orderBy: { createdAt: 'desc' } }),
  ]);
  return NextResponse.json({
    count,
    latest: l && { who: l.actorId, action: l.action, pname: l.patientNameSnapshot, date: fromDbDate(l.dateSnapshot), start: l.startSnapshot },
  });
});
