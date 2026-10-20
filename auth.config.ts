import type { NextAuthConfig } from 'next-auth';

/* Edge-veilige config (geen Prisma) — gedeeld door middleware en auth.ts. */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 }, // 12 uur
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLogin = request.nextUrl.pathname.startsWith('/login');
      if (isLogin) return auth ? Response.redirect(new URL('/', request.nextUrl)) : true;
      if (!auth?.user && request.nextUrl.pathname.startsWith('/api/'))
        return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
