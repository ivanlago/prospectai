CREATE TYPE "public"."search_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "discovery_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"name" text NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"identity_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid,
	"provider" text NOT NULL,
	"status" "search_run_status" DEFAULT 'running' NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "discovery_results" ADD CONSTRAINT "discovery_results_run_id_search_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."search_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discovery_results_run_id_reference_index" ON "discovery_results" USING btree ("run_id","reference");--> statement-breakpoint
CREATE INDEX "discovery_results_run_id_name_index" ON "discovery_results" USING btree ("run_id","name");--> statement-breakpoint
CREATE INDEX "search_runs_search_id_created_at_index" ON "search_runs" USING btree ("search_id","created_at");--> statement-breakpoint
CREATE INDEX "search_runs_provider_created_at_index" ON "search_runs" USING btree ("provider","created_at");