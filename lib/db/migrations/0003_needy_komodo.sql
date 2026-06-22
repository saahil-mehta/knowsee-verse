CREATE TABLE "PlaybookSection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"title" varchar(256) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"ordering" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lastEditedBy" uuid,
	"lastEditedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "PlaybookSection_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "PlaybookSection" ADD CONSTRAINT "PlaybookSection_lastEditedBy_User_id_fk" FOREIGN KEY ("lastEditedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbookSection_ordering_idx" ON "PlaybookSection" USING btree ("ordering");