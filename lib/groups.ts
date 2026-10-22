/* Overgenomen groepen: groepen van collega's die Joey (tijdelijk) geeft. Alleen Joey wijzigt ze.
   Er worden geen losse rijen per keer gemaakt; de agenda rekent de keren uit met de herhaalregel. */

import type { GroupTakeover, User } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './db';
import { ChangeError } from './errors';
import { nextDates, type GroupRule } from './schedule';
import { addDays, fromDbDate, toDbDate, todayISO } from './time';

type Row = GroupTakeover & { owner: Pick<User, 'displayName'> };

export const toRule = (g: Row): GroupRule => ({
  id: g.id,
  title: g.title,
  owner: g.ownerId,
  ownerName: g.owner.displayName,
  start: g.startMinutes,
  dur: g.durationMinutes,
  startDate: fromDbDate(g.startDate),
  endDate: g.endDate ? fromDbDate(g.endDate) : null,
  every: g.everyWeeks,
  skip: g.skipDates.map(fromDbDate).sort(),
  note: g.note,
});

/** Alle niet-verwijderde groepen (het zijn er weinig). */
export async function loadGroups(): Promise<GroupRule[]> {
  const rows = await prisma.groupTakeover.findMany({
    where: { deletedAt: null },
    include: { owner: { select: { displayName: true } } },
    orderBy: [{ startMinutes: 'asc' }],
  });
  return rows.map(toRule);
}

/* ---------- invoer ---------- */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const groupSchema = z
  .object({
    ownerId: z.string().min(1),
    title: z.string().trim().max(60).default(''),
    startDate: day,
    endDate: day.nullable().default(null),
    every: z.number().int().min(1).max(4),
    start: z.number().int().min(0).max(24 * 60 - 15).refine((v) => v % 15 === 0, 'Begintijd in kwartieren.'),
    dur: z.number().int().min(15).max(8 * 60).refine((v) => v % 15 === 0, 'Duur in kwartieren.'),
    note: z.string().trim().max(500).default(''),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: 'De einddatum ligt vóór de eerste keer.' })
  .refine((v) => v.start + v.dur <= 24 * 60, { message: 'De groep loopt over middernacht.' });
type GroupInput = z.infer<typeof groupSchema>;

export const groupPatchSchema = z.union([
  z.object({ op: z.literal('edit'), input: groupSchema }),
  z.object({ op: z.literal('skip'), date: day }),
  z.object({ op: z.literal('unskip'), date: day }),
  z.object({ op: z.literal('stop'), date: day }),
]);

/* ---------- schrijven ---------- */

async function checkOwner(ownerId: string) {
  const u = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!u || !u.isActive) throw new ChangeError('Kies een collega.');
  if (u.isOwner) throw new ChangeError('Kies de collega van wie de groep is.');
}

const data = (v: GroupInput) => ({
  ownerId: v.ownerId,
  title: v.title || 'Groepsles',
  startDate: toDbDate(v.startDate),
  endDate: v.endDate ? toDbDate(v.endDate) : null,
  everyWeeks: v.every,
  startMinutes: v.start,
  durationMinutes: v.dur,
  note: v.note,
});

/** Patiëntafspraken die in de komende keren van de groep vallen (mag, maar Joey wil het weten). */
async function clashes(id: number) {
  const g = await getGroup(id);
  const dates = nextDates(g, todayISO(), 52);
  if (!dates.length) return 0;
  const appts = await prisma.appointment.findMany({
    where: { date: { in: dates.map(toDbDate) }, deletedAt: null },
    select: { startMinutes: true, durationMinutes: true },
  });
  return appts.filter((a) => a.startMinutes < g.start + g.dur && g.start < a.startMinutes + a.durationMinutes).length;
}

async function getGroup(id: number) {
  const row = await prisma.groupTakeover.findFirst({ where: { id, deletedAt: null }, include: { owner: { select: { displayName: true } } } });
  if (!row) throw new ChangeError('Deze groep bestaat niet meer.', 404);
  return toRule(row);
}

export async function createGroup(actor: User, v: GroupInput) {
  await checkOwner(v.ownerId);
  const row = await prisma.groupTakeover.create({ data: { ...data(v), createdById: actor.id } });
  return { id: row.id, clashes: await clashes(row.id) };
}

export async function changeGroup(id: number, p: z.infer<typeof groupPatchSchema>) {
  const g = await getGroup(id);
  if (p.op === 'edit') {
    await checkOwner(p.input.ownerId);
    await prisma.groupTakeover.update({ where: { id }, data: data(p.input) });
    return { id, clashes: await clashes(id) };
  }
  if (p.op === 'skip' || p.op === 'unskip') {
    const skip = p.op === 'skip' ? [...new Set([...g.skip, p.date])] : g.skip.filter((d) => d !== p.date);
    await prisma.groupTakeover.update({ where: { id }, data: { skipDates: skip.map(toDbDate) } });
    return { id };
  }
  // stop: deze keer en alles daarna vervalt
  const endDate = addDays(p.date, -1);
  if (endDate < g.startDate) {
    await prisma.groupTakeover.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
  await prisma.groupTakeover.update({ where: { id }, data: { endDate: toDbDate(endDate) } });
  return { id };
}

export async function deleteGroup(id: number) {
  await getGroup(id);
  await prisma.groupTakeover.update({ where: { id }, data: { deletedAt: new Date() } });
  return { deleted: id };
}
