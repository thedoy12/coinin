ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "productType" varchar(20) DEFAULT 'general' NOT NULL;

ALTER TABLE "products"
  ADD CONSTRAINT "products_productType_check"
  CHECK ("productType" IN ('general', 'membership'));
