import type { User } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { prisma } from './db';
import { ChangeError } from './errors';

type Ctx = { params: Record<string, string> };

/** Route handler met ingelogde (actieve) gebruiker; owner: alleen Joey. */
export function withUser(fn: (user: User, req: Request, ctx: Ctx) => Promise<Response>, opts: { owner?: boolean } = {}) {
  return async (req: Request, ctx: Ctx) => {
    const session = await auth();
    const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;
    if (!user?.isActive) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
    if (opts.owner && !user.isOwner) return NextResponse.json({ error: 'Alleen voor Joey' }, { status: 403 });
    try {
      return await fn(user, req, ctx);
    } catch (e) {
      if (e instanceof ChangeError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message || 'Ongeldige invoer' }, { status: 400 });
      // lege of afgebroken body (bijv. geannuleerde live check)
      if (e instanceof SyntaxError) return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
      throw e;
    }
  };
}

export const idParam = (ctx: Ctx) => {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) throw new ChangeError('Ongeldig id', 404);
  return id;
};
