CREATE TABLE "website_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid,
	"revision" integer NOT NULL,
	"token_hash" text NOT NULL,
	"snapshot" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "website_share_links" ADD CONSTRAINT "website_share_links_project_id_website_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."website_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_share_links" ADD CONSTRAINT "website_share_links_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_share_links_project_id_created_at_index" ON "website_share_links" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "website_share_links_expires_at_index" ON "website_share_links" USING btree ("expires_at");