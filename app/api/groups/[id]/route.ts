import { NextResponse } from 'next/server';
import { idParam, withUser } from '@/lib/api';
import { changeGroup, deleteGroup, groupPatchSchema } from '@/lib/groups';

/** Aanpassen, één keer overslaan of stoppen vanaf een datum. */
export const PATCH = withUser(
  async (_user, req, ctx) => NextResponse.json(await changeGroup(idParam(ctx), groupPatchSchema.parse(await req.json()))),
  { owner: true },
);

export const DELETE = withUser(async (_user, _req, ctx) => NextResponse.json(await deleteGroup(idParam(ctx))), { owner: true });
