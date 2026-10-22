/* Kleur en initialen per collega. Iedere collega heeft een eigen kleur uit PALETTE (uniek in de database). */

/** Vaste kleuren, goed uit elkaar te houden. light = op licht thema, dark = op donker thema. */
export const PALETTE = [
  { key: 'petrol', name: 'Petrol', light: '#0e7c86', dark: '#4fc3cd' },
  { key: 'geel', name: 'Geel', light: '#b88a00', dark: '#f2c94c' },
  { key: 'oranje', name: 'Oranje', light: '#cc5a06', dark: '#f59e4c' },
  { key: 'rood', name: 'Rood', light: '#c0392b', dark: '#f07b6e' },
  { key: 'roze', name: 'Roze', light: '#c93a78', dark: '#f285b5' },
  { key: 'magenta', name: 'Magenta', light: '#9c2f97', dark: '#e07ad9' },
  { key: 'paars', name: 'Paars', light: '#7443b8', dark: '#b592e6' },
  { key: 'indigo', name: 'Indigo', light: '#4450bd', dark: '#959df2' },
  { key: 'blauw', name: 'Blauw', light: '#1f6fd1', dark: '#6aa6ee' },
  { key: 'hemelsblauw', name: 'Hemelsblauw', light: '#0784b6', dark: '#5cc5ef' },
  { key: 'smaragd', name: 'Smaragd', light: '#0f8566', dark: '#5fd3b0' },
  { key: 'groen', name: 'Groen', light: '#2e8b3e', dark: '#79c98a' },
  { key: 'limoen', name: 'Limoen', light: '#5e8a00', dark: '#b5dd4f' },
  { key: 'bruin', name: 'Bruin', light: '#8a5a2b', dark: '#d6a676' },
  { key: 'bordeaux', name: 'Bordeaux', light: '#8e2140', dark: '#de7896' },
  { key: 'leisteen', name: 'Leisteen', light: '#56677b', dark: '#a8b6c7' },
] as const;

export type ColorKey = (typeof PALETTE)[number]['key'];
export const colorByKey = (k: string | null | undefined) => PALETTE.find((p) => p.key === k);

export type StaffColor = { id: string; hue: number; color?: string | null };

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
  const val = (u: StaffColor, dark: boolean) => {
    const p = colorByKey(u.color);
    if (p) return dark ? p.dark : p.light;
    return dark ? `hsl(${u.hue} 60% 68%)` : `hsl(${u.hue} 55% 38%)`;
  };
  const L = ok.map((u) => `--s-${u.id}:${val(u, false)}`).join(';');
  const D = ok.map((u) => `--s-${u.id}:${val(u, true)}`).join(';');
  return `:root{${L}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${D}}}:root[data-theme="dark"]{${D}}`;
}
