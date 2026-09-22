CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar NOT NULL,
	"external_id" varchar NOT NULL,
	"title" text,
	"location" text,
	"html_link" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"start_date" date,
	"status" varchar,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_org_extid_unique" UNIQUE("organization_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_org_idx" ON "calendar_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "calendar_events_org_start_idx" ON "calendar_events" USING btree ("organization_id","start_at");