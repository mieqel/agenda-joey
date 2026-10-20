import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';

export const POST = withUser(
  async () => {
    await prisma.activityLog.updateMany({ where: { readByOwner: false }, data: { readByOwner: true } });
    return NextResponse.json({ ok: true });
  },
  { owner: true },
);
