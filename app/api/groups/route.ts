import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';
import { createGroup, groupSchema } from '@/lib/groups';

/** Groep overnemen (alleen Joey). */
export const POST = withUser(
  async (user, req) => NextResponse.json(await createGroup(user, groupSchema.parse(await req.json()))),
  { owner: true },
);
