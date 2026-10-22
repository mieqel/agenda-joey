-- Eigen kleur per collega + overgenomen groepen

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "GroupTakeover" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Groepsles',
    "ownerId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "everyWeeks" INTEGER NOT NULL DEFAULT 1,
    "startMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "skipDates" DATE[] DEFAULT ARRAY[]::DATE[],
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GroupTakeover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupTakeover_deletedAt_idx" ON "GroupTakeover"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_color_key" ON "User"("color");

-- AddForeignKey
ALTER TABLE "GroupTakeover" ADD CONSTRAINT "GroupTakeover_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTakeover" ADD CONSTRAINT "GroupTakeover_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Kleuren voor het bestaande team (Guido = geel)
UPDATE "User" SET "color" = v.c
FROM (VALUES
  ('joey', 'petrol'), ('anouk', 'roze'), ('diana', 'blauw'), ('guido', 'geel'), ('jasper', 'rood'),
  ('jeannette', 'paars'), ('joeyve', 'smaragd'), ('joyce', 'indigo'), ('marloes', 'magenta'), ('maddy', 'bordeaux'),
  ('martin', 'bruin'), ('perry', 'oranje'), ('tessa', 'hemelsblauw'), ('thomas', 'limoen'), ('viresh', 'groen')
) AS v(id, c)
WHERE "User"."id" = v.id;

-- Later toegevoegde collega's: eerstvolgende vrije kleur (zelfde volgorde als PALETTE)
DO $$
DECLARE
  u RECORD;
  k TEXT;
BEGIN
  FOR u IN SELECT "id" FROM "User" WHERE "color" IS NULL ORDER BY "createdAt" LOOP
    SELECT p.key INTO k
    FROM unnest(ARRAY['petrol','geel','oranje','rood','roze','magenta','paars','indigo','blauw','hemelsblauw','smaragd','groen','limoen','bruin','bordeaux','leisteen']) WITH ORDINALITY AS p(key, ord)
    WHERE p.key NOT IN (SELECT "color" FROM "User" WHERE "color" IS NOT NULL)
    ORDER BY p.ord
    LIMIT 1;
    EXIT WHEN k IS NULL;
    UPDATE "User" SET "color" = k WHERE "id" = u."id";
  END LOOP;
END $$;
