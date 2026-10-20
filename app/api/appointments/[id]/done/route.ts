import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { idParam, withUser } from '@/lib/api';

/** Alleen Joey: afgerond aan/uit. */
export const POST = withUser(
  async (_user, req, ctx) => {
    const { done } = z.object({ done: z.boolean() }).parse(await req.json());
    await prisma.appointment.updateMany({ where: { id: idParam(ctx), deletedAt: null }, data: { done } });
    return NextResponse.json({ done });
  },
  { owner: true },
);
