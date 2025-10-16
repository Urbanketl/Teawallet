ALTER TABLE "transactions" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "method" varchar;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "rfid_card_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rfid_card_id_rfid_cards_id_fk" FOREIGN KEY ("rfid_card_id") REFERENCES "public"."rfid_cards"("id") ON DELETE no action ON UPDATE no action;