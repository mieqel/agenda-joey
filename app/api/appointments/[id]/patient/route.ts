import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { idParam, withUser } from '@/lib/api';
import { ChangeError } from '@/lib/appointments';

/** Alleen Joey: van een "nieuwe patiënt" een echte patiënt maken.
    Alle afspraken met dezelfde naam (zonder patiënt) worden gekoppeld. */
export const POST = withUser(
  async (user, _req, ctx) => {
    const a = await prisma.appointment.findFirst({ where: { id: idParam(ctx), deletedAt: null } });
    if (!a || a.patientId || !a.newPatientName) throw new ChangeError('Deze afspraak heeft al een patiënt.');
    const name = a.newPatientName;
    const p = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.create({ data: { name, createdById: user.id } });
      await tx.appointment.updateMany({
        where: { patientId: null, newPatientName: name },
        data: { patientId: p.id, newPatientName: null },
      });
      return p;
    });
    return NextResponse.json({ patientId: p.id });
  },
  { owner: true },
);
