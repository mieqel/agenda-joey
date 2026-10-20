import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { prisma } from './lib/db';
import { checkPin } from './lib/pin';
import { isLoginBlocked, recordLoginAttempt } from './lib/rate-limit';

class RateLimited extends CredentialsSignin {
  code = 'rate_limited';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { userId: {}, pin: {} },
      // Rate limiting zit hier, zodat ook /api/auth/callback/credentials beschermd is.
      async authorize(c, request) {
        const userId = typeof c.userId === 'string' ? c.userId : '';
        const pin = typeof c.pin === 'string' ? c.pin.trim() : '';
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'onbekend';

        if (await isLoginBlocked(ip, userId || null)) throw new RateLimited();
        const user = await prisma.user.findFirst({ where: { id: userId, isActive: true } });
        const ok = !!user && checkPin(pin, user.isOwner);
        await recordLoginAttempt(ip, user?.id ?? null, ok);
        return ok ? { id: user.id, name: user.name } : null;
      },
    }),
  ],
});
