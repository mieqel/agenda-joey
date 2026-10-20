import { signOut } from '@/auth';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { todayISO } from '@/lib/time';
import { Avatar } from '../components/Avatar';
import { StaffColors } from '../components/StaffColors';
import { AppProvider } from './AppProvider';
import { HelpButton, InstallButton } from './ShellButtons';
import { Tabs } from './Tabs';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  // ook gedeactiveerde collega's: hun oude afspraken houden kleur en naam
  const staff = await prisma.user.findMany({
    select: { id: true, name: true, displayName: true, roleLabel: true, hue: true },
    orderBy: { name: 'asc' },
  });

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <AppProvider
      me={{ id: me.id, name: me.name, displayName: me.displayName, isOwner: me.isOwner, tourDismissed: me.tourDismissed }}
      staffList={staff.map(({ hue: _hue, ...s }) => s)}
      today={todayISO()}
    >
      <StaffColors users={staff} />
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
            <div className="userchip">
              <InstallButton />
              <Avatar id={me.id} name={me.name} />
              <div className="who-name">
                <strong>{me.name}</strong>
                <small>{me.isOwner ? 'Eigenaar agenda' : me.roleLabel}</small>
              </div>
              <form action={logout}>
                <button className="btn small" type="submit">Uitloggen</button>
              </form>
            </div>
          </header>
        </div>
      </div>
      <div className="wrap">
        <Tabs />
        <main id="view">{children}</main>
      </div>
      <HelpButton />
    </AppProvider>
  );
}
