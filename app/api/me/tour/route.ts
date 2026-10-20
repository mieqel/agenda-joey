import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withUser } from '@/lib/api';

/** "Niet meer laten zien" */
export const POST = withUser(async (user) => {
  await prisma.user.update({ where: { id: user.id }, data: { tourDismissed: true } });
  return NextResponse.json({ ok: true });
});
