CREATE TABLE IF NOT EXISTS "popup_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "isActive" integer DEFAULT 0 NOT NULL,
  "title" varchar(120) DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "imageUrl" varchar(500),
  "buttonText" varchar(60) DEFAULT 'Lihat Promo' NOT NULL,
  "buttonUrl" varchar(500) DEFAULT '#game-store' NOT NULL,
  "displayDelayMs" integer DEFAULT 1200 NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "popup_settings" (
  "id",
  "isActive",
  "title",
  "description",
  "imageUrl",
  "buttonText",
  "buttonUrl",
  "displayDelayMs"
)
VALUES (
  1,
  0,
  'Promo CoinIn',
  'Top up game favorit kamu lebih cepat dengan pembayaran praktis.',
  NULL,
  'Top Up Sekarang',
  '#game-store',
  1200
)
ON CONFLICT ("id") DO NOTHING;
