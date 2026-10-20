import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { idParam, withUser } from '@/lib/api';

/** Joey heeft de afspraak geopend: oranje stip weg. */
export const POST = withUser(
  async (_user, _req, ctx) => {
    await prisma.appointment.updateMany({ where: { id: idParam(ctx) }, data: { seenByOwner: true } });
    return NextResponse.json({ ok: true });
  },
  { owner: true },
);
