CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"status" varchar NOT NULL,
	"hosting" varchar,
	"url" text,
	"provider" varchar,
	"environment" varchar,
	"credential_location" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("provider", '') || ' ' || coalesce("notes", ''))) STORED,
	CONSTRAINT "resources_status_check" CHECK ("resources"."status" IN ('ACTIVE', 'IN_PROGRESS', 'PAUSED', 'RETIRED')),
	CONSTRAINT "resources_hosting_check" CHECK ("resources"."hosting" IN ('OWN', 'CLIENT', 'THIRD_PARTY'))
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resources_org_idx" ON "resources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "resources_client_idx" ON "resources" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "resources_project_idx" ON "resources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "resources_search_idx" ON "resources" USING gin ("search_vector");