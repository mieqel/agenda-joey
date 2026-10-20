'use server';

import { AuthError, CredentialsSignin } from 'next-auth';
import { signIn } from '@/auth';

export type LoginState = { error?: string; ok?: boolean };

const MESSAGES: Record<string, string> = {
  rate_limited: 'Te veel onjuiste pogingen. Probeer het over 15 minuten opnieuw.',
  credentials: 'Onjuiste pincode.',
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const userId = String(formData.get('userId') ?? '');
  const pin = String(formData.get('pin') ?? '');
  if (!userId) return { error: 'Kies eerst wie je bent.' };
  const missing = ['AUTH_SECRET', 'APP_PIN'].filter((k) => !process.env[k]);
  if (missing.length) return { error: `Instelling ontbreekt: ${missing.join(', ')}. Vul deze in .env (of bij Vercel) in.` };

  let url: string;
  try {
    url = await signIn('credentials', { userId, pin, redirect: false, redirectTo: '/' });
  } catch (e) {
    if (e instanceof CredentialsSignin) return { error: MESSAGES[e.code] ?? MESSAGES.credentials };
    if (e instanceof AuthError) return { error: 'Inloggen lukt nu niet. Probeer het opnieuw.' };
    throw e;
  }
  const params = new URL(url, 'http://x').searchParams;
  if (params.get('error')) return { error: MESSAGES[params.get('code') ?? ''] ?? MESSAGES.credentials };
  // de browser laadt daarna zelf de agenda (zie LoginForm)
  return { ok: true };
}
