/* Kleur en initialen per collega, zoals in de demo. */

export type StaffColor = { id: string; hue: number };

/** "Jasper de Koning" → "JK", "Joey van Eeden" → "JE" */
export const initials = (fullName: string) =>
  fullName
    .split(' ')
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

/** Alleen veilige tekens, want het id wordt een CSS-variabele (--s-<id>). */
export const isSafeId = (id: string) => /^[a-z0-9-]+$/.test(id);

export function staffColorCss(users: StaffColor[]) {
  const ok = users.filter((u) => isSafeId(u.id));
  const L = ok.map((u) => `--s-${u.id}:hsl(${u.hue} 55% 38%)`).join(';');
  const D = ok.map((u) => `--s-${u.id}:hsl(${u.hue} 60% 68%)`).join(';');
  return `:root{${L}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`;
}
