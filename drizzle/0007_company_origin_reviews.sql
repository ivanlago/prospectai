CREATE TABLE "company_origin_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"reference" text NOT NULL,
	"permission" text NOT NULL,
	"review" jsonb NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_origin_reviews" ADD CONSTRAINT "company_origin_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_origin_reviews_company_id_provider_reference_reviewed_at_index" ON "company_origin_reviews" USING btree ("company_id","provider","reference","reviewed_at");--> statement-breakpoint
CREATE INDEX "company_origin_reviews_provider_reference_index" ON "company_origin_reviews" USING btree ("provider","reference");
--> statement-breakpoint
INSERT INTO "company_origin_reviews" ("company_id","provider","reference","permission","review","reviewed_at","created_at")
SELECT "company_id","provider","reference","permission","review","created_at","created_at" FROM "company_sources"
ON CONFLICT DO NOTHING;
