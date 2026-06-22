CREATE TABLE "UserPreference" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"hasSeenTour" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;