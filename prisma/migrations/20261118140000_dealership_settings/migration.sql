BEGIN;

ALTER TABLE "Dealer"
    ADD COLUMN "shortName" VARCHAR(100) NOT NULL DEFAULT 'Kuraishi',
    ADD COLUMN "tagline" VARCHAR(160) NOT NULL DEFAULT 'Ihr Fahrzeug. Ihre Entscheidung.',
    ADD COLUMN "websiteUrl" VARCHAR(2048) NOT NULL DEFAULT 'https://www.kuraishi-autohandel.at',
    ADD COLUMN "description" TEXT NOT NULL DEFAULT 'Geprüfte Gebrauchtwagen, transparente Angebote und persönliche Beratung in Wien.',
    ADD COLUMN "phone" VARCHAR(32) NOT NULL DEFAULT '+43 664 123 45 67',
    ADD COLUMN "email" VARCHAR(254) NOT NULL DEFAULT 'office@kuraishi-autohandel.at',
    ADD COLUMN "street" VARCHAR(255) NOT NULL DEFAULT 'Treustraße 57/4/3',
    ADD COLUMN "postalCode" VARCHAR(32) NOT NULL DEFAULT '1200',
    ADD COLUMN "city" VARCHAR(120) NOT NULL DEFAULT 'Wien',
    ADD COLUMN "country" VARCHAR(120) NOT NULL DEFAULT 'Österreich',
    ADD COLUMN "mapUrl" VARCHAR(2048) NOT NULL DEFAULT 'https://maps.google.com/?q=Treustraße+57%2F4%2F3%2C+1200+Wien',
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMIT;
