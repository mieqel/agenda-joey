import { prisma } from '@/lib/db';
import { requireOwner } from '@/lib/session';
import { DAYSL, fmtTime } from '@/lib/time';
import { Avatar } from '../../components/Avatar';
import { deleteBlock, setStaffActive } from './actions';
import { AddBlockForm, AddStaffForm, HoursForm } from './forms';

/** Kleur die het verst van de bestaande kleuren af ligt. */
function freeHue(used: number[]) {
  let best = 0, bestDist = -1;
  for (let h = 0; h < 360; h += 5) {
    const d = Math.min(...used.map((u) => Math.min(Math.abs(h - u), 360 - Math.abs(h - u))));
    if (d > bestDist) [best, bestDist] = [h, d];
  }
  return best;
}

export default async function InstellingenPage() {
  const me = await requireOwner();
  const [staff, hours, blocks] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ isOwner: 'desc' }, { isActive: 'desc' }, { name: 'asc' }] }),
    prisma.workingHours.findMany(),
    prisma.fixedBlock.findMany({ orderBy: [{ weekday: 'asc' }, { startMinutes: 'asc' }] }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2>Instellingen</h2>
        <div className="muted">Alleen jij ziet deze pagina.</div>
      </div>

      <section className="box">
        <h3>Collega&apos;s</h3>
        <p className="hint" style={{ margin: 0 }}>
          Iedereen logt in met de gedeelde pincode (APP_PIN in Vercel). Wijzig je de pincode, laat het dan je collega&apos;s weten.
          Gedeactiveerde collega&apos;s kunnen niet meer inloggen; hun afspraken en meldingen blijven bewaard.
        </p>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Naam</th>
                <th>Functie</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={s.isActive ? undefined : { opacity: 0.55 }}>
                  <td style={{ width: 44 }}>
                    <Avatar id={s.id} name={s.name} size={30} />
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                    {s.displayName !== s.name.split(' ')[0] && <div className="muted" style={{ fontSize: '.8rem' }}>In de agenda: {s.displayName}</div>}
                  </td>
                  <td className="muted">{s.isOwner ? 'Eigenaar agenda' : s.roleLabel}</td>
                  <td>{s.isActive ? <span className="pill ok">Actief</span> : <span className="pill nieuw">Gedeactiveerd</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    {s.id !== me.id && (
                      <form action={setStaffActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.isActive ? '0' : '1'} />
                        <button className="btn small" type="submit">{s.isActive ? 'Deactiveren' : 'Weer activeren'}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddStaffForm suggestHue={freeHue(staff.map((s) => s.hue))} />
      </section>

      <section className="box">
        <h3>Werktijden</h3>
        <p className="hint" style={{ margin: 0 }}>Buiten deze tijden kan niemand iets bij je inplannen.</p>
        <HoursForm hours={Object.fromEntries(hours.map((h) => [h.weekday, [fmtTime(h.startMinutes), fmtTime(h.endMinutes)]]))} />
      </section>

      <section className="box">
        <h3>Vaste blokken</h3>
        <p className="hint" style={{ margin: 0 }}>Lessen en andere vaste momenten. Hierin kan niemand iets inplannen.</p>
        {blocks.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dag</th>
                  <th>Tijd</th>
                  <th>Wat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id}>
                    <td>{DAYSL[b.weekday]}</td>
                    <td className="mono">
                      {fmtTime(b.startMinutes)}–{fmtTime(b.startMinutes + b.durationMinutes)}
                    </td>
                    <td>{b.title}</td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={deleteBlock}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="icon-btn" type="submit" aria-label={`${b.title} op ${DAYSL[b.weekday]} verwijderen`}>×</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Geen vaste blokken.</p>
        )}
        <AddBlockForm />
      </section>
    </div>
  );
}
