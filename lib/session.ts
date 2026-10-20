import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from './db';

/** De ingelogde, actieve gebruiker — of terug naar /login. */
export async function requireUser() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  // gedeactiveerd account: sessie direct ongeldig
  if (!user || !user.isActive) redirect('/uitloggen');
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (!user.isOwner) redirect('/');
  return user;
}
