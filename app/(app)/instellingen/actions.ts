'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireOwner } from '@/lib/session';

export type FormState = { error?: string; ok?: string };

const toMin = (v: FormDataEntryValue | null) => {
  const m = String(v ?? '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : NaN;
};
const done = (ok: string): FormState => {
  revalidatePath('/instellingen');
  return { ok };
};

/* ---------- collega's ---------- */

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const name = String(fd.get('name') ?? '').trim();
  const displayName = String(fd.get('displayName') ?? '').trim() || name.split(' ')[0];
  const roleLabel = String(fd.get('roleLabel') ?? '').trim() || 'Fysiotherapeut';
  const hue = Number(fd.get('hue'));
  if (name.length < 3 || !/^[A-Z]/.test(name)) return { error: 'Vul een volledige naam in, met hoofdletter (bijv. "Sanne de Wit").' };
  if (!Number.isInteger(hue) || hue < 0 || hue > 359) return { error: 'Kleur moet tussen 0 en 359 liggen.' };

  // id wordt de CSS-variabele --s-<id>: alleen a-z en 0-9
  const base = displayName.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') || 'collega';
  let id = base;
  for (let n = 2; await prisma.user.findUnique({ where: { id } }); n++) id = base + n;

  await prisma.user.create({ data: { id, name, displayName, roleLabel, hue } });
  return done(`${name} is toegevoegd en kan inloggen met de gedeelde pincode.`);
}

export async function setStaffActive(fd: FormData) {
  const me = await requireOwner();
  const id = String(fd.get('id'));
  if (id === me.id) return;
  await prisma.user.update({ where: { id }, data: { isActive: fd.get('active') === '1' } });
  revalidatePath('/instellingen');
}

/* ---------- werktijden ---------- */

export async function saveHours(_: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const rows: { weekday: number; startMinutes: number; endMinutes: number }[] = [];
  for (let wd = 1; wd <= 6; wd++) {
    if (fd.get(`on${wd}`) !== 'on') continue;
    const s = toMin(fd.get(`s${wd}`)), e = toMin(fd.get(`e${wd}`));
    if (Number.isNaN(s) || Number.isNaN(e) || s >= e) return { error: 'Controleer de tijden: de eindtijd moet na de begintijd liggen.' };
    if (s % 15 || e % 15) return { error: 'Gebruik kwartieren (bijv. 08:00, 12:30, 16:45).' };
    rows.push({ weekday: wd, startMinutes: s, endMinutes: e });
  }
  await prisma.$transaction([prisma.workingHours.deleteMany(), prisma.workingHours.createMany({ data: rows })]);
  return done('Werktijden opgeslagen. Bestaande afspraken blijven staan.');
}

/* ---------- vaste blokken ---------- */

export async function addBlock(_: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const weekday = Number(fd.get('weekday'));
  const start = toMin(fd.get('start'));
  const dur = Number(fd.get('dur'));
  const title = String(fd.get('title') ?? '').trim();
  if (!(weekday >= 1 && weekday <= 6)) return { error: 'Kies een dag.' };
  if (Number.isNaN(start) || start % 15) return { error: 'Kies een begintijd in kwartieren.' };
  if (!(dur >= 15 && dur <= 480 && dur % 15 === 0)) return { error: 'Duur in kwartieren, tussen 15 en 480 minuten.' };
  if (!title) return { error: 'Geef het blok een naam, bijv. "Groepsles".' };
  await prisma.fixedBlock.create({ data: { weekday, startMinutes: start, durationMinutes: dur, title } });
  return done(`"${title}" toegevoegd.`);
}

export async function deleteBlock(fd: FormData) {
  await requireOwner();
  await prisma.fixedBlock.delete({ where: { id: Number(fd.get('id')) } }).catch(() => {});
  revalidatePath('/instellingen');
}
