CREATE TABLE "ChatShare" (
	"chatId" uuid NOT NULL,
	"sharedWithUserId" uuid NOT NULL,
	"sharedByUserId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ChatShare_chatId_sharedWithUserId_pk" PRIMARY KEY("chatId","sharedWithUserId")
);
--> statement-breakpoint
ALTER TABLE "ChatShare" ADD CONSTRAINT "ChatShare_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatShare" ADD CONSTRAINT "ChatShare_sharedWithUserId_User_id_fk" FOREIGN KEY ("sharedWithUserId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChatShare" ADD CONSTRAINT "ChatShare_sharedByUserId_User_id_fk" FOREIGN KEY ("sharedByUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ChatShare_sharedWithUserId_idx" ON "ChatShare" USING btree ("sharedWithUserId");