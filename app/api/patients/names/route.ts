import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Namen die eerder als "nieuwe patiënt" zijn ingepland, nieuwste eerst (voor suggesties). */
export const GET = withUser(async () => {
  const rows = await prisma.appointment.findMany({
    where: { patientId: null, newPatientName: { not: null }, deletedAt: null },
    select: { newPatientName: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const seen = new Set<string>();
  const names: string[] = [];
  for (const r of rows) {
    const n = r.newPatientName!.trim();
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  return NextResponse.json(names);
});
