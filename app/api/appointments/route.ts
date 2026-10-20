import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';
import { changeAppointments, createSchema } from '@/lib/appointments';

export const POST = withUser(async (user, req) => {
  const input = createSchema.parse(await req.json());
  return NextResponse.json(await changeAppointments(user, { op: 'add', input }));
});
