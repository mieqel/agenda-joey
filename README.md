# Agenda Joey · Fysiotherapie Meerzicht

Gedeelde agenda voor Joey Inge (personal trainer). Collega's zien wanneer Joey vrij is en plannen patiënten bij hem in, met instructie en oefenschema. Geen vervanging van Intramed. Zie [PRIVACY.md](PRIVACY.md) voor wat er wordt opgeslagen.

Stack: Next.js 14 · Prisma 5.22.0 (**niet upgraden**) · Neon Postgres (Frankfurt) · Auth.js v5 · SWR · Vercel (fra1).

## Wat zit erin

- **Agenda:** week- en dagweergave (ma–za, rooster volgt de werktijden), groene vrije vakken, lanes voor overlappende afspraken, nu-lijn, sneltoetsen (← → T D W N). Ververst elke 25 seconden en als je terugkomt naar het venster.
- **Inplannen:** datum/tijd/duur, herhalen 2/4/6 weken, bestaande of nieuwe patiënt, instructie, oefeningen plakken uit Intramed of zelf invullen. Live check: buiten werktijd of tijdens een vast blok = geblokkeerd, overlap met een andere patiënt = waarschuwing maar toegestaan.
- **Afspraak:** wie het inplande, instructie, oefeningen, patiëntgegevens, geschiedenis, "tegelijk met", andere afspraken. Afgerond (Joey), verzetten, + nog iemand, verwijderen.
- **Meldingen** (Joey): alles wat collega's deden, met badge en banner.
- **Patiënten:** zoeken, profiel, huidig oefenschema, afspraken. Joey kan gegevens aanpassen en patiënten toevoegen.
- **Instellingen** (Joey): collega's toevoegen/deactiveren, werktijden, vaste blokken.
- **Rondleiding** en **Hulp**-knop, **installeerbaar** als app (PWA).

De server controleert alles opnieuw. Elke wijziging loopt via `changeAppointments()` in [lib/appointments.ts](lib/appointments.ts), die het logboek in dezelfde transactie schrijft.

## Omgevingsvariabelen

| Naam | Wat | Voorbeeld |
|---|---|---|
| `DATABASE_URL` | Neon, **pooled** (host bevat `-pooler`) | `postgresql://…@ep-…-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | Neon, **direct** (zelfde host zonder `-pooler`), voor migraties | `postgresql://…@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `AUTH_SECRET` | Geheime sleutel voor sessies, 32+ tekens. Maak met `npx auth secret` | |
| `APP_PIN` | Gedeelde pincode voor iedereen | |
| `OWNER_PIN` | Optioneel: aparte pincode voor Joey. Leeg = `APP_PIN` | |

Lokaal staan ze in `.env` (niet in git). Bij Vercel: Project → Settings → Environment Variables.

## Lokaal draaien

```bash
npm install
npm run db:migrate   # tabellen aanmaken/bijwerken in Neon
npm run db:seed      # collega's, werktijden, vaste blokken + voorbeelddata in de huidige week
npm run dev          # http://localhost:3000
npm test             # unit tests (parser + planningsregels)
```

## Live zetten op Vercel

### 1. Database klaarmaken (eenmalig)

De database bevat nu de **voorbeelddata** uit de demo (verzonnen patiënten). Voor echt gebruik begin je schoon. Dit wist **alles** in de database:

```powershell
npx prisma migrate reset --skip-seed --force
$env:SEED_DEMO="0"; npm run db:seed
```

Je houdt dan alleen de collega's, werktijden en vaste blokken. Gebruik je liever een aparte database voor live: maak in Neon een tweede project of branch (regio Frankfurt) en gebruik die URLs bij Vercel.

### 2. Code naar GitHub

Maak op github.com een **privé** repository (bijv. `agenda-joey`) en push deze map:

```bash
git add -A
git commit -m "Agenda Joey"
git remote add origin https://github.com/<jouw-naam>/agenda-joey.git
git push -u origin main
```

### 3. Vercel-project

1. Ga naar vercel.com → **Add New… → Project** → importeer de repository.
2. Framework: Next.js (automatisch). Build command: laat staan (`npm run build`).
3. Vul bij **Environment Variables** de vijf variabelen hierboven in. Gebruik voor `AUTH_SECRET` een **nieuwe** waarde, niet die van je laptop. Kies een sterke `APP_PIN` en `OWNER_PIN`.
4. **Deploy.** De regio staat al op Frankfurt via [vercel.json](vercel.json). Controleer bij Settings → Functions dat de regio `fra1` is.
5. Open de URL (bijv. `agenda-joey.vercel.app`) en log in.

Elke `git push` naar `main` zet daarna automatisch een nieuwe versie live.

### 4. Schema later wijzigen

Pas [prisma/schema.prisma](prisma/schema.prisma) aan, draai lokaal `npx prisma migrate dev --name <wat>` en daarna tegen de live database `npm run db:migrate`, vóór je pusht.

## Installeren als app op de praktijkcomputers

Open de agenda in **Chrome** of **Edge** en klik rechtsboven op **App installeren** (of: menu ⋮ → *App installeren* / *Apps → Deze site als app installeren*). Er komt een icoon op het bureaublad dat de agenda in een eigen venster opent. Er wordt niets offline opgeslagen.

## Mappen

- `app/login`: inlogscherm (naam + pincode)
- `app/(app)`: alles achter de login: agenda, meldingen, patiënten, instellingen, zijpaneel, rondleiding
- `app/api`: JSON-endpoints (allemaal met login-check)
- `lib/schedule.ts`: planningsregels (gedeeld door server en browser), `lib/parse-paste.ts`: Intramed-parser, `lib/appointments.ts`: alle wijzigingen + logboek
- `prisma/`: schema, migraties, seed
- `docs/meerzicht-agenda.html`: de originele demo (referentie)
