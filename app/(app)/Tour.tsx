'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { weekStartOf } from '@/lib/time';
import { useApp } from './AppProvider';
import { send } from './client';

type Step = { sel?: string; t: string; b: string; agenda?: boolean };

const STAFF_STEPS: Step[] = [
  { t: 'Welkom in de agenda van Joey', b: 'Hier zie je wanneer Joey vrij is en plan je zelf een patiënt bij hem in. Geen briefjes of losse berichten meer. Deze uitleg duurt een halve minuut.' },
  { sel: '.userchip', t: 'Je bent ingelogd', b: 'Rechtsboven staat wie er is ingelogd. Zo ziet Joey wie de afspraak heeft gemaakt. Op een gedeelde computer: log uit als je klaar bent.' },
  { sel: '.free', agenda: true, t: 'Groen = Joey is vrij', b: 'Klik op een groen vak om op dat moment een patiënt in te plannen. Gestreept betekent dat Joey er niet is.' },
  { sel: '.ev[data-id]', agenda: true, t: 'Klik op een afspraak', b: 'Je ziet wie het heeft ingepland, wat Joey moet doen en de oefeningen met sets en herhalingen.' },
  { sel: '.navbar', agenda: true, t: 'Snel navigeren', b: 'Pijltjes voor vorige/volgende, <strong>Vandaag</strong> om terug te springen, en klik op een dag om alleen die dag als lijst te zien. Met <strong>Dag</strong> en <strong>Week</strong> wissel je de weergave.' },
  { sel: '#book', agenda: true, t: 'Of gebruik deze knop', b: 'Handig als je een vaste tijd wilt kiezen of een afspraak een paar weken wilt herhalen.' },
  { t: 'Oefenschema uit Intramed plakken', b: 'Open het oefenprogramma in Intramed, selecteer alles met <span class="kbd">Ctrl</span>+<span class="kbd">A</span>, kopieer met <span class="kbd">Ctrl</span>+<span class="kbd">C</span> en plak het bij het inplannen met <span class="kbd">Ctrl</span>+<span class="kbd">V</span>. Overtypen hoeft niet.' },
  { sel: '.ev:has(.shared)', agenda: true, t: 'Joey is al bezig? Dat mag', b: 'Joey kan meerdere mensen tegelijk begeleiden. Plan je in op een moment dat hij al iemand heeft, dan zie je wie dat is en dat zijn aandacht verdeeld wordt. Je kunt dan toch inplannen. Twee patiënten tegelijk staan naast elkaar met 👥. In een afspraak zit ook de knop <strong>+ Nog iemand</strong> om er snel iemand bij te zetten. Alleen buiten werktijd en tijdens groepslessen gaat het niet.' },
  { sel: '.helpbtn', t: 'Vergeten hoe het werkt?', b: 'Klik rechtsonder op <strong>Hulp</strong> en deze uitleg start opnieuw.' },
];
const OWNER_STEPS: Step[] = [
  { t: 'Je eigen agenda', b: 'Collega’s plannen hier patiënten bij je in. Jij ziet altijd wie wat heeft gedaan.' },
  { sel: 'a[href="/meldingen"]', agenda: true, t: 'Meldingen', b: 'Elke keer dat iemand iets inplant, verzet of verwijdert, staat het hier met naam en tijd.' },
  { sel: '.ev[data-id]', agenda: true, t: 'De gekleurde rand', b: 'Elke collega heeft een eigen kleur en initialen. Een oranje stip betekent dat je de afspraak nog niet hebt geopend.' },
  { sel: '.ev:has(.shared)', agenda: true, t: 'Meerdere mensen tegelijk', b: 'Collega’s mogen iemand inplannen als je al iemand hebt. Ze krijgen dan een waarschuwing dat je aandacht verdeeld wordt. In de grid staat 👥, en in je meldingen zie je bij wie ze erbij zijn gezet.' },
  { sel: 'a[href="/instellingen"]', t: 'Instellingen', b: 'Hier beheer je collega’s, je werktijden en vaste blokken zoals je groepslessen.' },
  { sel: '.helpbtn', t: 'Uitleg nodig?', b: 'Via <strong>Hulp</strong> start deze rondleiding opnieuw.' },
];

export function Tour() {
  const { me, endTour, toast, setNav, today } = useApp();
  const router = useRouter();
  const path = usePathname();
  const steps = me.isOwner ? OWNER_STEPS : STAFF_STEPS;
  const [i, setI] = useState(0);
  const [el, setEl] = useState<Element | null>(null);
  const [, force] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const st = steps[i];
  const last = i === steps.length - 1;

  // stap voorbereiden: naar de agenda (weekweergave, deze week) en wachten tot het element er is
  useEffect(() => {
    setEl(null);
    if (st.agenda) {
      setNav({ mode: 'week', weekStart: weekStartOf(today) });
      if (path !== '/') router.push('/');
    }
    if (!st.sel) return;
    let tries = 0;
    const iv = setInterval(() => {
      const found = document.querySelector(st.sel!);
      if (found || ++tries > 30) {
        clearInterval(iv);
        if (found) {
          found.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
          setEl(found);
        }
      }
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const onResize = () => force((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = useCallback(
    (how: 'later' | 'off' | 'done') => {
      try {
        sessionStorage.setItem('tour-later', '1');
      } catch {}
      if (how === 'off') {
        send('/api/me/tour', 'POST').catch(() => {});
        toast('Oké, de uitleg komt niet meer vanzelf. Hulp staat rechtsonder.');
      }
      if (how === 'done') toast('Je kunt aan de slag. Hulp nodig? Rechtsonder.');
      endTour();
    },
    [endTour, toast],
  );

  useEffect(() => {
    nextRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('later');
      if (e.key === 'ArrowRight' && !last) setI((n) => n + 1);
      if (e.key === 'ArrowLeft' && i) setI((n) => n - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [i, last, close]);

  // kaart naast het gemarkeerde element plaatsen
  const [pos, setPos] = useState<{ spot?: DOMRect; top: number; left: number }>({ top: 0, left: 0 });
  useLayoutEffect(() => {
    const c = cardRef.current;
    if (!c) return;
    const cw = c.offsetWidth, ch = c.offsetHeight, W = innerWidth, H = innerHeight;
    if (!el) return setPos({ top: Math.max(16, (H - ch) / 2), left: (W - cw) / 2 });
    const r = el.getBoundingClientRect();
    let top = r.bottom + 14;
    if (top + ch > H - 16) top = r.top - ch - 14;
    if (top < 16) top = Math.max(16, H - ch - 16);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), W - cw - 16);
    setPos({ spot: r, top, left });
  }, [el, i]);

  const pad = 6;
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tT">
      {pos.spot ? (
        <div className="spot" style={{ left: pos.spot.left - pad, top: pos.spot.top - pad, width: pos.spot.width + pad * 2, height: pos.spot.height + pad * 2 }} />
      ) : (
        <div className="tour-shade" />
      )}
      <div className="tcard" ref={cardRef} style={{ top: pos.top, left: pos.left }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="tdots">
            {steps.map((_, n) => (
              <i key={n} className={n === i ? 'on' : ''} />
            ))}
          </div>
          <span className="muted mono" style={{ fontSize: '.78rem' }}>{i + 1}/{steps.length}</span>
        </div>
        <h3 id="tT">{st.t}</h3>
        <p dangerouslySetInnerHTML={{ __html: st.b }} />
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          {i > 0 && <button className="btn small" onClick={() => setI(i - 1)}>Vorige</button>}
          <button className="btn small primary" ref={nextRef} onClick={() => (last ? close('done') : setI(i + 1))}>{last ? 'Klaar' : 'Volgende'}</button>
        </div>
        <div className="tfoot">
          <button className="linkbtn" onClick={() => close('later')}>Later</button>
          <button className="linkbtn" onClick={() => close('off')}>Niet meer laten zien</button>
        </div>
      </div>
    </div>
  );
}
