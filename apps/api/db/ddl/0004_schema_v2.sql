-- R1b: remove sharing, spend/ledger and webhook storage; add the graph,
-- diagram, analytics and admin schemas.

DROP TABLE IF EXISTS "webhook_deliveries";
DROP TABLE IF EXISTS "repository_push_events";
DROP TABLE IF EXISTS "job_llm_calls";
DROP TABLE IF EXISTS "course_reports";

ALTER TABLE "courses" DROP COLUMN "visibility";
ALTER TABLE "courses" DROP COLUMN "share_token";
DROP TYPE IF EXISTS "visibility";

ALTER TABLE "generation_jobs" DROP COLUMN "budget_micros";
ALTER TABLE "generation_jobs" DROP COLUMN "spent_micros";

ALTER TABLE "model_preferences" DROP COLUMN "preset";
ALTER TABLE "model_preferences" DROP COLUMN "custom_models";
ALTER TABLE "model_preferences" DROP COLUMN "default_budget_micros";
ALTER TABLE "model_preferences" ADD COLUMN "default_model" text;

ALTER TABLE "repositories" DROP COLUMN "license";

ALTER TABLE "repository_snapshots" ADD COLUMN "graph" jsonb;

ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;

CREATE TABLE "diagram_specs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"diagram_id" text NOT NULL,
	"type" text NOT NULL,
	"spec" jsonb NOT NULL,
	"validation" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diagram_specs_version_id_diagram_id_unique" UNIQUE("version_id","diagram_id")
);
ALTER TABLE "diagram_specs" ADD CONSTRAINT "diagram_specs_version_id_course_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."course_versions"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "diagram_specs_version_idx" ON "diagram_specs" USING btree ("version_id");

CREATE TABLE "saved_dashboards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"query" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_dashboards_user_name_unique" UNIQUE("user_id","name")
);
ALTER TABLE "saved_dashboards" ADD CONSTRAINT "saved_dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "saved_dashboards_user_updated_idx" ON "saved_dashboards" USING btree ("user_id","updated_at" DESC);
CREATE INDEX "saved_dashboards_name_trgm_idx" ON "saved_dashboards" USING gin ("name" gin_trgm_ops);

CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"subject_type" text,
	"subject_id" text,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "analytics_events_user_occurred_idx" ON "analytics_events" USING btree ("user_id","occurred_at" DESC);
CREATE INDEX "analytics_events_type_occurred_idx" ON "analytics_events" USING btree ("type","occurred_at" DESC);
