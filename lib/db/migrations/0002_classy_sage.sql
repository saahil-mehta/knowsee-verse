CREATE TABLE "Feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"userEmail" text NOT NULL,
	"kind" varchar NOT NULL,
	"category" varchar(32),
	"message" text NOT NULL,
	"chatId" uuid,
	"messageId" uuid,
	"pageContext" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_userId_idx" ON "Feedback" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "feedback_createdAt_idx" ON "Feedback" USING btree ("createdAt");