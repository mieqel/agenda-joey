'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from './AppProvider';
import type { Unread } from './client';

export function Tabs() {
  const { me } = useApp();
  const path = usePathname();
  const { data: unread } = useSWR<Unread>(me.isOwner ? '/api/unread' : null);
  const tabs = [
    { href: '/', label: 'Agenda' },
    ...(me.isOwner ? [{ href: '/meldingen', label: 'Meldingen' }] : []),
    { href: '/patienten', label: 'Patiënten' },
    ...(me.isOwner ? [{ href: '/instellingen', label: 'Instellingen' }] : []),
  ];
  return (
    <nav className="tabs" role="tablist">
      {tabs.map((t) => {
        const on = t.href === '/' ? path === '/' : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" role="tab" aria-selected={on}>
            {t.label}
            {t.href === '/meldingen' && !!unread?.count && !on && <span className="badge">{unread.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
