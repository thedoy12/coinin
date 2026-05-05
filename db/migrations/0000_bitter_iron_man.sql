CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"thumbnail" varchar(500),
	"category" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameId" bigint NOT NULL,
	"providerCode" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"priceModal" integer NOT NULL,
	"priceSell" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"referenceId" varchar(100) NOT NULL,
	"gameId" bigint NOT NULL,
	"productId" bigint NOT NULL,
	"userIdGame" varchar(255) NOT NULL,
	"zoneId" varchar(100),
	"price" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"paymentStatus" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"paymentMethod" varchar(50),
	"paymentReference" varchar(255),
	"topupStatus" varchar(50),
	"topupReference" varchar(255),
	"topupResponse" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_referenceId_unique" UNIQUE("referenceId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);
--> statement-breakpoint
CREATE INDEX "gameId_idx" ON "products" USING btree ("gameId");--> statement-breakpoint
CREATE INDEX "referenceId_idx" ON "transactions" USING btree ("referenceId");--> statement-breakpoint
CREATE INDEX "status_idx" ON "transactions" USING btree ("status");