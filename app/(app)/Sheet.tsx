'use client';

import { useEffect } from 'react';
import { useApp } from './AppProvider';
import { ApptDetail } from './ApptDetail';
import { BookingForm } from './BookingForm';
import { GroupDetail, GroupForm } from './GroupViews';

/** Zijpaneel rechts: afspraakdetails of inplannen. */
export function Sheet() {
  const { sheet, closeSheet } = useApp();

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSheet();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet, closeSheet]);

  if (!sheet) return null;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
      <div className="sheet" role="dialog" aria-modal="true">
        {sheet.type === 'appt' ? (
          <ApptDetail key={sheet.id} id={sheet.id} />
        ) : sheet.type === 'book' ? (
          <BookingForm key={JSON.stringify(sheet.opts.edit?.id ?? sheet.opts)} opts={sheet.opts} />
        ) : sheet.type === 'group' ? (
          <GroupDetail key={`${sheet.id}-${sheet.date}`} id={sheet.id} date={sheet.date} />
        ) : (
          <GroupForm key={JSON.stringify(sheet.opts.edit?.id ?? sheet.opts)} opts={sheet.opts} />
        )}
      </div>
    </div>
  );
}
