import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';
import { loadRules, toClient } from '@/lib/appointments';
import { addDays, nowMinutes, toDbDate, todayISO, weekStartOf } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Week (ma–za) met afspraken, werktijden en vaste blokken. ?week=YYYY-MM-DD (elke dag in die week) */
export const GET = withUser(async (_user, req) => {
  const q = new URL(req.url).searchParams.get('week');
  const today = todayISO();
  const weekStart = weekStartOf(q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : today);
  const [rules, rows] = await Promise.all([
    loadRules(),
    prisma.appointment.findMany({
      where: { date: { gte: toDbDate(weekStart), lte: toDbDate(addDays(weekStart, 5)) }, deletedAt: null },
      include: { patient: { select: { name: true } }, _count: { select: { exercises: true } } },
      orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
    }),
  ]);
  return NextResponse.json({ weekStart, today, now: nowMinutes(), ...rules, appts: rows.map(toClient) });
});
