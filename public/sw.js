/* Minimale service worker: alleen nodig om "App installeren" mogelijk te maken.
   Er wordt bewust niets gecachet: patiëntgegevens mogen niet offline op een computer blijven staan. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
