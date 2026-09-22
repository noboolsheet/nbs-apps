CREATE TABLE "log_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" varchar NOT NULL,
	"seq" integer NOT NULL,
	"range_from" timestamp with time zone NOT NULL,
	"range_to" timestamp with time zone NOT NULL,
	"row_count" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"content" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_archives_org_kind_seq_unique" UNIQUE("organization_id","kind","seq"),
	CONSTRAINT "log_archives_kind_check" CHECK ("log_archives"."kind" IN ('JOBS', 'OUTBOX'))
);
--> statement-breakpoint
ALTER TABLE "log_archives" ADD CONSTRAINT "log_archives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_archives_org_created_idx" ON "log_archives" USING btree ("organization_id","created_at");--> statement-breakpoint
-- La tabla anterior sólo guardaba lotes de PROCESOS: se traen tal cual con kind='JOBS' (si el entorno ya la tenía
-- con datos; en uno recién migrado estará vacía y este INSERT no copia nada). Después se elimina.
INSERT INTO "log_archives" ("id","organization_id","kind","seq","range_from","range_to","row_count","size_bytes","content","created_at")
SELECT "id","organization_id",'JOBS',"seq","range_from","range_to","row_count","size_bytes","content","created_at"
FROM "job_log_archives";--> statement-breakpoint
DROP TABLE "job_log_archives" CASCADE;
