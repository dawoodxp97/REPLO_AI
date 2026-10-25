CREATE TABLE "operators" (
	"user_id" text PRIMARY KEY NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_push_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repository_id" uuid NOT NULL,
	"commit_sha" text NOT NULL,
	"paths" text[] NOT NULL,
	"pushed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorial_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tutorial_id" uuid NOT NULL,
	"reporter_id" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutorials" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_push_events" ADD CONSTRAINT "repo_push_events_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_reports" ADD CONSTRAINT "tutorial_reports_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_reports" ADD CONSTRAINT "tutorial_reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repo_push_events_repo_pushed_idx" ON "repo_push_events" USING btree ("repository_id","pushed_at");--> statement-breakpoint
CREATE INDEX "tutorial_reports_tutorial_idx" ON "tutorial_reports" USING btree ("tutorial_id");