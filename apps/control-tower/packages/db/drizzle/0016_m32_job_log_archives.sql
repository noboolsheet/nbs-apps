CREATE TABLE "job_log_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"range_from" timestamp with time zone NOT NULL,
	"range_to" timestamp with time zone NOT NULL,
	"row_count" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_log_archives_org_seq_unique" UNIQUE("organization_id","seq")
);
--> statement-breakpoint
ALTER TABLE "job_log_archives" ADD CONSTRAINT "job_log_archives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_log_archives_org_created_idx" ON "job_log_archives" USING btree ("organization_id","created_at");