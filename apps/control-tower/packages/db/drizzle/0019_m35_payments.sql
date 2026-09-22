CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"concept" varchar NOT NULL,
	"direction" varchar NOT NULL,
	"status" varchar NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'EUR' NOT NULL,
	"client_id" uuid,
	"contact_id" uuid,
	"payee_label" varchar,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("concept", '') || ' ' || coalesce("payee_label", ''))) STORED,
	CONSTRAINT "payments_direction_check" CHECK ("payments"."direction" IN ('IN', 'OUT')),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" IN ('PENDING', 'PAID'))
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_org_status_idx" ON "payments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "payments_client_idx" ON "payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "payments_search_idx" ON "payments" USING gin ("search_vector");