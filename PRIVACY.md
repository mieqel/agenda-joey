# Privacy: Agenda Joey

*Voor de praktijkmanager van Fysiotherapie Meerzicht. Laatst bijgewerkt: oktober 2026.*

## Waarvoor is de app?

Agenda Joey is een planningshulpmiddel. Collega's zien wanneer Joey Inge (personal trainer) vrij is en plannen een patiënt bij hem in, met een korte instructie en het oefenschema. Het vervangt mondelinge afspraken en briefjes.

Het is **geen** elektronisch patiëntendossier. Het dossier blijft in Intramed.

## Welke gegevens staan erin?

| Gegeven | Waarom |
|---|---|
| Naam van de patiënt | Joey moet weten wie hij verwacht |
| Geboortejaar (optioneel) | Belastbaarheid inschatten, zonder volledige geboortedatum |
| Doel en klacht, in gewone woorden | Waar de training op gericht is |
| "Let op" (bijv. "kniebuiging max. 100°") | Veilig trainen |
| Afspraken: datum, tijd, soort, instructie, oefeningen | De planning zelf |
| Collega's: naam, functie, kleur | Zichtbaar maken wie wat heeft ingepland |
| Logboek: wie heeft wanneer wat ingepland, verzet of verwijderd | Controle achteraf (audit trail) |
| Inlogpogingen: IP-adres, tijdstip, gelukt of niet | Beveiliging tegen raden van de pincode; na 30 dagen automatisch verwijderd |

**Niet** opgeslagen: BSN, adres, telefoonnummer, verzekeringsgegevens, verwijzingen, diagnoses of andere dossierstukken. Medewerkers zijn gevraagd om ook in vrije tekstvelden geen BSN, verzekeringsgegevens of medische details te zetten.

## Waar staan de gegevens?

- Database: **Neon Postgres, regio Frankfurt (Duitsland, EU)**
- Website/server: **Vercel, regio Frankfurt (fra1)**
- Alle verbindingen gaan via **HTTPS** (versleuteld). De database-verbinding is ook versleuteld (`sslmode=require`).
- De app laadt geen lettertypes, scripts of trackers van derden. Er zijn geen analytics of cookies voor marketing.

## Wie kan erbij?

- Alleen ingelogde medewerkers. Elke pagina en elke gegevensaanvraag controleert of iemand is ingelogd.
- Inloggen: je kiest je naam en vult de pincode van de praktijk in. Joey kan een eigen pincode hebben.
- Na 5 foute pogingen vanaf één computer, of 10 voor één naam, is inloggen 15 minuten geblokkeerd.
- Een sessie verloopt na 12 uur. Op gedeelde computers moet je zelf uitloggen.
- Alleen Joey ziet Meldingen en Instellingen, en kan patiëntgegevens aanpassen.
- Een medewerker die vertrekt, deactiveert Joey bij Instellingen; die kan dan direct niet meer inloggen.
- De app wordt niet door zoekmachines geïndexeerd.

**Let op, beperking:** iedereen gebruikt dezelfde pincode. De app vertrouwt erop dat medewerkers hun eigen naam kiezen. Wil de praktijk dit strenger, dan kan dat later met een persoonlijke pincode of wachtwoord per medewerker.

## Verwijderen en bewaren

- Een verwijderde afspraak verdwijnt uit de agenda, maar blijft (gemarkeerd als verwijderd) in de database staan, samen met het logboek. Zo is altijd na te gaan wie wat heeft gedaan.
- Er is nog geen automatische bewaartermijn voor oude afspraken en patiënten. Advies: spreek een termijn af (bijv. 2 jaar na de laatste afspraak) en laat oude gegevens periodiek verwijderen.
- Inzage- of verwijderverzoek van een patiënt: Joey of de beheerder kan de gegevens opzoeken en verwijderen in de database.

## Verwerkers

Neon Inc. (database) en Vercel Inc. (hosting) zijn verwerkers. Beide bieden een verwerkersovereenkomst (DPA) met de standaardcontractbepalingen van de EU. **Actie voor de praktijk:** accepteer de DPA in beide accounts en neem ze op in het verwerkingsregister.
