import { prisma } from './db';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_PER_USER = 10;

export async function isLoginBlocked(ip: string, userId: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byIp, byUser] = await Promise.all([
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
    userId ? prisma.loginAttempt.count({ where: { userId, success: false, createdAt: { gte: since } } }) : 0,
  ]);
  return byIp >= MAX_FAILS_PER_IP || byUser >= MAX_FAILS_PER_USER;
}

export async function recordLoginAttempt(ip: string, userId: string | null, success: boolean) {
  await prisma.$transaction([
    prisma.loginAttempt.create({ data: { ip, userId, success } }),
    // oude pogingen opruimen: niet langer bewaren dan nodig
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } }),
  ]);
}
