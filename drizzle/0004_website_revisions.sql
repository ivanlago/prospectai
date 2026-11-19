CREATE TABLE "website_revisions" (
	"project_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	"actor_id" uuid,
	"restored_from" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_revisions" ADD CONSTRAINT "website_revisions_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_revisions" ADD CONSTRAINT "website_revisions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "website_revisions_project_id_revision_index" ON "website_revisions" USING btree ("project_id","revision");