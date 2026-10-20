import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () =>
  NextResponse.json(await prisma.patient.findMany({ select: { id: true, name: true, complaint: true }, orderBy: { name: 'asc' } })),
);

/** Alleen Joey: patiënt toevoegen. */
export const POST = withUser(
  async (user, req) => {
    const { name } = z.object({ name: z.string().trim().min(2, 'Vul een naam in.').max(120) }).parse(await req.json());
    const p = await prisma.patient.create({ data: { name, createdById: user.id } });
    return NextResponse.json({ id: p.id });
  },
  { owner: true },
);
