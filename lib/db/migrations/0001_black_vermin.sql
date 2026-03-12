CREATE TABLE IF NOT EXISTS "BrandProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"brandName" varchar(256) NOT NULL,
	"websiteUrl" varchar(512) NOT NULL,
	"logoUrl" varchar(512),
	"country" varchar(64) NOT NULL,
	"categories" json NOT NULL,
	"competitors" json NOT NULL,
	"retailers" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BrandProfile_projectId_unique" UNIQUE("projectId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "projectId" uuid;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BrandProfile_projectId_Project_id_fk') THEN
    ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_userId_User_id_fk') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_userId_idx" ON "Project" USING btree ("userId");--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Chat_projectId_Project_id_fk') THEN
    ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
