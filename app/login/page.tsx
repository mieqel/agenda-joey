import { prisma } from '@/lib/db';
import { StaffColors } from '../components/StaffColors';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ isOwner: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, displayName: true, roleLabel: true, hue: true, color: true, isOwner: true },
  });
  return (
    <>
      <StaffColors users={users} />
      <div className="appbar">
        <div className="appbar-in">
          <header className="top">
            <div className="brand">
              <div className="mark" aria-hidden="true">J</div>
              <div>
                <h1>Agenda Joey</h1>
                <div className="muted" style={{ fontSize: '.85rem' }}>
                  Personal training &amp; revalidatie · Fysiotherapie Meerzicht
                </div>
              </div>
            </div>
          </header>
        </div>
      </div>
      <main className="login">
        <LoginForm users={users} />
      </main>
    </>
  );
}
