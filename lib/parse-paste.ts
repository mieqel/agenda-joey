/* Oefenprogramma geplakt uit Intramed → oefeningen.
   Herkent "Leg extension 3x15", "Leg extension 3 × 15 10 kg", genummerde/opsommingsregels,
   en een naamregel gevolgd door een losse regel "3 x 15". Reps mogen s/sec/min/m/meter of een bereik (10-12) zijn.
   De originele tekst wordt altijd ook bewaard en getoond. */

export type ParsedExercise = { name: string; sets: string; reps: string; load: string };

const RX = /(\d+)\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:sec|s|min|m|meter)?)\b/i;
const clean = (s: string) =>
  s
    .replace(/^\s*(\d+[.)]|[-•*])\s*/, '')
    .replace(/[\s:,–-]+$/, '')
    .trim();

export function parsePaste(txt: string): ParsedExercise[] {
  const lines = String(txt || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: (ParsedExercise | { text: string })[] = [];
  let last: string | null = null;
  for (const l of lines) {
    const m = l.match(RX);
    if (m && m.index !== undefined) {
      let name = clean(l.slice(0, m.index));
      const rest = l
        .slice(m.index + m[0].length)
        .replace(/^[\s,–-]+/, '')
        .trim();
      // losse "3 x 15"-regel hoort bij de naam op de regel erboven
      if (!name && last) {
        name = last;
        out.pop();
      }
      if (name) {
        out.push({ name, sets: m[1], reps: m[2].replace(/\s+/g, ' ').replace(/\s*([-–])\s*/, '$1').trim(), load: rest });
        last = null;
        continue;
      }
    }
    out.push({ text: l });
    last = clean(l);
  }
  return out.filter((o): o is ParsedExercise => 'name' in o);
}
