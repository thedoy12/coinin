ALTER TABLE "users"
  ADD COLUMN "username" varchar(100),
  ADD COLUMN "passwordHash" text,
  ADD COLUMN "authProvider" varchar(30) DEFAULT 'kimi' NOT NULL;

CREATE UNIQUE INDEX "users_username_unique" ON "users" ("username");
