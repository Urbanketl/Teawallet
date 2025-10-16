CREATE TABLE "business_unit_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_unit_id" varchar NOT NULL,
	"from_user_id" varchar,
	"to_user_id" varchar NOT NULL,
	"transferred_by" varchar NOT NULL,
	"reason" text,
	"transfer_date" timestamp DEFAULT now(),
	"assets_transferred" jsonb
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"code" varchar NOT NULL,
	"description" text,
	"wallet_balance" numeric(10, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "business_units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "dispensing_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_unit_id" varchar,
	"payment_type" varchar DEFAULT 'rfid' NOT NULL,
	"rfid_card_id" integer,
	"upi_payment_id" varchar,
	"upi_vpa" varchar,
	"external_transaction_id" varchar,
	"external_id" varchar,
	"machine_id" varchar NOT NULL,
	"tea_type" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"cups" integer DEFAULT 1,
	"success" boolean DEFAULT true,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"external_created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"business_unit_id" varchar,
	"email_type" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"delivery_status" varchar(50) DEFAULT 'sent',
	"last_sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "faq_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar NOT NULL,
	"order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"views" integer DEFAULT 0,
	"helpful" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machine_certificates" (
	"machine_id" varchar PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"certificate_hash" varchar NOT NULL,
	"master_key_version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"last_authentication" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machine_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" varchar NOT NULL,
	"sync_type" varchar NOT NULL,
	"data_pushed" jsonb,
	"sync_status" varchar NOT NULL,
	"error_message" text,
	"response_time" integer,
	"cards_updated" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"email_enabled" boolean DEFAULT true,
	"balance_alerts" boolean DEFAULT true,
	"critical_alerts" boolean DEFAULT true,
	"low_balance_alerts" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "pending_payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"business_unit_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pending_payment_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referee_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"reward_amount" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfid_auth_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"machine_id" varchar NOT NULL,
	"card_identifier" varchar,
	"business_unit_id" varchar,
	"auth_method" varchar NOT NULL,
	"auth_result" boolean NOT NULL,
	"error_message" text,
	"response_time" integer,
	"challenge_hash" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfid_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_unit_id" varchar NOT NULL,
	"card_number" varchar NOT NULL,
	"card_name" varchar,
	"hardware_uid" varchar,
	"aes_key_encrypted" text,
	"card_type" varchar DEFAULT 'basic',
	"is_active" boolean DEFAULT true,
	"last_used" timestamp,
	"last_used_machine_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "rfid_cards_card_number_unique" UNIQUE("card_number"),
	CONSTRAINT "rfid_cards_hardware_uid_unique" UNIQUE("hardware_uid")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb,
	"is_from_support" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"description" text NOT NULL,
	"category" varchar NOT NULL,
	"priority" varchar DEFAULT 'medium',
	"status" varchar DEFAULT 'open',
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tea_machines" (
	"id" varchar PRIMARY KEY NOT NULL,
	"business_unit_id" varchar,
	"name" varchar NOT NULL,
	"location" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_ping" timestamp,
	"last_sync" timestamp,
	"sync_status" varchar DEFAULT 'pending',
	"ip_address" varchar,
	"auth_token" varchar,
	"master_key_hash" varchar,
	"cards_count" integer DEFAULT 0,
	"tea_types" jsonb,
	"price" numeric(10, 2) DEFAULT '5.00',
	"serial_number" varchar,
	"installation_date" timestamp,
	"maintenance_contact" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"old_status" varchar,
	"new_status" varchar NOT NULL,
	"updated_by" varchar NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"business_unit_id" varchar,
	"machine_id" varchar,
	"type" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'completed',
	"razorpay_order_id" varchar,
	"razorpay_payment_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "upi_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_type" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"records_found" integer DEFAULT 0,
	"records_processed" integer DEFAULT 0,
	"records_skipped" integer DEFAULT 0,
	"sync_status" varchar NOT NULL,
	"error_message" text,
	"response_time" integer,
	"api_response" jsonb,
	"triggered_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_business_units" (
	"user_id" varchar NOT NULL,
	"business_unit_id" varchar NOT NULL,
	"role" varchar DEFAULT 'manager',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"mobile_number" varchar NOT NULL,
	"profile_image_url" varchar,
	"is_admin" boolean DEFAULT false,
	"is_super_admin" boolean DEFAULT false,
	"requires_password_reset" boolean DEFAULT true,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "business_unit_transfers" ADD CONSTRAINT "business_unit_transfers_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_transfers" ADD CONSTRAINT "business_unit_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_transfers" ADD CONSTRAINT "business_unit_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_transfers" ADD CONSTRAINT "business_unit_transfers_transferred_by_users_id_fk" FOREIGN KEY ("transferred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_logs" ADD CONSTRAINT "dispensing_logs_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_logs" ADD CONSTRAINT "dispensing_logs_rfid_card_id_rfid_cards_id_fk" FOREIGN KEY ("rfid_card_id") REFERENCES "public"."rfid_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_certificates" ADD CONSTRAINT "machine_certificates_machine_id_tea_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."tea_machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_sync_logs" ADD CONSTRAINT "machine_sync_logs_machine_id_tea_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."tea_machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_payment_orders" ADD CONSTRAINT "pending_payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_payment_orders" ADD CONSTRAINT "pending_payment_orders_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_auth_logs" ADD CONSTRAINT "rfid_auth_logs_machine_id_tea_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."tea_machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_auth_logs" ADD CONSTRAINT "rfid_auth_logs_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tea_machines" ADD CONSTRAINT "tea_machines_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_machine_id_tea_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."tea_machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business_units" ADD CONSTRAINT "user_business_units_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business_units" ADD CONSTRAINT "user_business_units_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;