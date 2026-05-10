ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "paymentCheckoutUrl" varchar(1000);
