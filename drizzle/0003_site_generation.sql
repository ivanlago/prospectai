CREATE TYPE "public"."site_status" AS ENUM('running', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "website_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"template" text NOT NULL,
	"status" "site_status" DEFAULT 'running' NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_micros" integer NOT NULL,
	"content" jsonb,
	"error" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_projects_created_at_index" ON "website_projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "website_projects_company_id_created_at_index" ON "website_projects" USING btree ("company_id","created_at");