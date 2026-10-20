'use client';

import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';

export function HelpButton() {
  const { startTour } = useApp();
  return (
    <button className="helpbtn" onClick={startTour} aria-label="Uitleg bekijken">
      <i aria-hidden="true">?</i>Hulp
    </button>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Toont "App installeren" zodra Chrome/Edge dat aanbiedt; registreert ook de service worker. */
export function InstallButton() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEv(e as InstallEvent);
    };
    const onInstalled = () => setEv(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!ev) return null;
  return (
    <button
      className="btn small"
      title="Zet Agenda Joey als app op het bureaublad"
      onClick={async () => {
        await ev.prompt();
        await ev.userChoice;
        setEv(null);
      }}
    >
      App installeren
    </button>
  );
}
