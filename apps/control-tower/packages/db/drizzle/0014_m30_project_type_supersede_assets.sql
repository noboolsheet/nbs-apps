CREATE TABLE "project_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_assets_unique" UNIQUE("project_id","asset_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "type" varchar DEFAULT 'INTERNAL' NOT NULL;--> statement-breakpoint
-- Backfill A-1: los proyectos que ya tienen cliente pasan a CLIENT; el resto queda INTERNAL (LAB se marca a mano).
UPDATE "projects" SET "type" = 'CLIENT' WHERE "client_id" IS NOT NULL AND "personal" = false;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "supersedes_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_assets_project_id" ON "project_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_assets_asset_id" ON "project_assets" USING btree ("asset_id");--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_supersedes_decision_id_decisions_id_fk" FOREIGN KEY ("supersedes_decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decisions_supersedes_idx" ON "decisions" USING btree ("supersedes_decision_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_type_check" CHECK ("projects"."type" IN ('INTERNAL', 'CLIENT', 'LAB'));