CREATE TABLE "website_edit_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"actor_id" uuid,
	"base_revision" integer NOT NULL,
	"status" "site_status" DEFAULT 'running' NOT NULL,
	"model" text NOT NULL,
	"operations" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_micros" integer NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "website_edit_attempts" ADD CONSTRAINT "website_edit_attempts_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_edit_attempts" ADD CONSTRAINT "website_edit_attempts_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_edit_attempts_created_at_index" ON "website_edit_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "website_edit_attempts_project_id_created_at_index" ON "website_edit_attempts" USING btree ("project_id","created_at");