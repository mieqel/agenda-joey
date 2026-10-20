'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { weekStartOf } from '@/lib/time';
import { fetcher, type Detail } from './client';
import { Sheet } from './Sheet';
import { Tour } from './Tour';

export type Me = { id: string; name: string; displayName: string; isOwner: boolean; tourDismissed: boolean };
export type Staff = { id: string; name: string; displayName: string; roleLabel: string };
export type BookOpts = { date?: string; start?: number; edit?: Detail; patientId?: number };
type SheetState = null | { type: 'appt'; id: number } | { type: 'book'; opts: BookOpts };
export type Nav = { mode: 'week' | 'dag'; weekStart: string; day: string };

type Ctx = {
  me: Me;
  staff: Record<string, Staff>;
  today: string;
  sheet: SheetState;
  openAppt: (id: number) => void;
  openBooking: (opts?: BookOpts) => void;
  closeSheet: () => void;
  nav: Nav;
  setNav: (n: Partial<Nav>) => void;
  toast: (msg: string) => void;
  refresh: () => void;
  tourOpen: boolean;
  startTour: () => void;
  endTour: () => void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

function Inner({ me, staffList, today, children }: { me: Me; staffList: Staff[]; today: string; children: React.ReactNode }) {
  const { mutate } = useSWRConfig();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [nav, setNavState] = useState<Nav>({ mode: 'week', weekStart: weekStartOf(today), day: today });
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [tourOpen, setTourOpen] = useState(false);

  const staff = useMemo(() => Object.fromEntries(staffList.map((s) => [s.id, s])), [staffList]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  const refresh = useCallback(() => {
    mutate((key) => typeof key === 'string' && key.startsWith('/api/'));
  }, [mutate]);

  // rondleiding: vanzelf tot "Niet meer laten zien"; "Later" geldt voor deze sessie
  useEffect(() => {
    let later = false;
    try {
      later = sessionStorage.getItem('tour-later') === '1';
    } catch {}
    if (!me.tourDismissed && !later) {
      const t = setTimeout(() => setTourOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [me.tourDismissed]);

  const value: Ctx = {
    me,
    staff,
    today,
    sheet,
    openAppt: (id) => setSheet({ type: 'appt', id }),
    openBooking: (opts = {}) => setSheet({ type: 'book', opts }),
    closeSheet: () => setSheet(null),
    nav,
    setNav: (n) => setNavState((s) => ({ ...s, ...n })),
    toast,
    refresh,
    tourOpen,
    startTour: () => {
      setSheet(null);
      setTourOpen(true);
    },
    endTour: () => setTourOpen(false),
  };

  return (
    <AppCtx.Provider value={value}>
      {children}
      <Sheet />
      {tourOpen && <Tour />}
      {toasts.slice(-1).map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.msg}
        </div>
      ))}
    </AppCtx.Provider>
  );
}

export function AppProvider(props: { me: Me; staffList: Staff[]; today: string; children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, refreshInterval: 25_000, revalidateOnFocus: true, keepPreviousData: true }}>
      <Inner {...props} />
    </SWRConfig>
  );
}
