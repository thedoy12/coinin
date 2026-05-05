CREATE TABLE "provider_api_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "provider" varchar(50) NOT NULL,
  "referenceId" varchar(100),
  "method" varchar(10) NOT NULL,
  "endpoint" varchar(255) NOT NULL,
  "requestPayload" text,
  "responsePayload" text,
  "statusCode" integer,
  "success" integer DEFAULT 0 NOT NULL,
  "error" text,
  "durationMs" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "provider_api_logs_provider_idx" ON "provider_api_logs" USING btree ("provider");
CREATE INDEX "provider_api_logs_reference_idx" ON "provider_api_logs" USING btree ("referenceId");
CREATE INDEX "provider_api_logs_created_idx" ON "provider_api_logs" USING btree ("createdAt");
