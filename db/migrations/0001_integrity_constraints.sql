ALTER TABLE "products"
  ALTER COLUMN "gameId" TYPE integer USING "gameId"::integer;

ALTER TABLE "transactions"
  ALTER COLUMN "gameId" TYPE integer USING "gameId"::integer,
  ALTER COLUMN "productId" TYPE integer USING "productId"::integer;

ALTER TABLE "products"
  ADD CONSTRAINT "products_gameId_games_id_fk"
  FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE cascade;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_gameId_games_id_fk"
  FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE restrict;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_productId_products_id_fk"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE restrict;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_status_check"
  CHECK ("status" IN ('pending', 'processing', 'success', 'failed'));

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_payment_status_check"
  CHECK ("paymentStatus" IN ('unpaid', 'pending', 'paid', 'expired', 'failed'));

CREATE UNIQUE INDEX "products_game_provider_unique"
  ON "products" ("gameId", "providerCode");
