CREATE TABLE "VisibilityAudit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"chatId" uuid,
	"overallScore" integer NOT NULL,
	"modelResults" json NOT NULL,
	"categoryResults" json NOT NULL,
	"competitorResults" json NOT NULL,
	"recommendations" json,
	"probeCount" integer NOT NULL,
	"modelsQueried" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "VisibilityAudit" ADD CONSTRAINT "VisibilityAudit_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VisibilityAudit" ADD CONSTRAINT "VisibilityAudit_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visibility_audit_projectId_idx" ON "VisibilityAudit" USING btree ("projectId");