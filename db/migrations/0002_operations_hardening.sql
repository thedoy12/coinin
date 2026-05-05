ALTER TABLE "games"
  ADD COLUMN "instructions" text,
  ADD COLUMN "requiresZoneId" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "isActive" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "products"
  ADD COLUMN "isActive" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "transactions"
  ADD COLUMN "customerName" varchar(255),
  ADD COLUMN "customerEmail" varchar(320),
  ADD COLUMN "customerPhone" varchar(20),
  ADD COLUMN "retryCount" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "lastError" text,
  ADD COLUMN "expiresAt" timestamp,
  ADD COLUMN "paidAt" timestamp,
  ADD COLUMN "completedAt" timestamp;

CREATE TABLE "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actorUserId" integer,
  "action" varchar(100) NOT NULL,
  "entityType" varchar(50) NOT NULL,
  "entityId" varchar(100) NOT NULL,
  "before" text,
  "after" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorUserId_users_id_fk"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE set null;

CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entityType", "entityId");
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actorUserId");
