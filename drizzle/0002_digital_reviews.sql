CREATE TABLE "company_sources" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"reference" text NOT NULL,
	"permission" text NOT NULL,
	"review" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_reviews" (
	"result_id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"presence" text NOT NULL,
	"evidence" text NOT NULL,
	"website" text NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"qualified" boolean NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_sources" ADD CONSTRAINT "company_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_reviews" ADD CONSTRAINT "website_reviews_result_id_discovery_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."discovery_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_reviews" ADD CONSTRAINT "website_reviews_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_sources_provider_reference_index" ON "company_sources" USING btree ("provider","reference");