import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withUser } from '@/lib/api';
import { checkSlots, seriesDates } from '@/lib/appointments';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(0).max(1440),
  dur: z.number().int().min(15).max(240),
  repeat: z.number().int().min(1).max(12).default(1),
  every: z.number().int().min(1).max(4).default(1),
  ignoreId: z.number().int().optional(),
});

/** Live check voor het inplanformulier. */
export const POST = withUser(async (_user, req) => {
  const v = schema.parse(await req.json());
  const dates = seriesDates(v.date, v.repeat, v.every);
  return NextResponse.json({ results: await checkSlots(dates, v.start, v.dur, v.ignoreId) });
});
