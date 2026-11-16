CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('password', 'google', 'github');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'waiting_retry', 'stalled', 'canceling', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('openrouter', 'anthropic', 'openai', 'google');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'link', 'public');--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"password_hash" text,
	"access_token_ciphertext" text,
	"access_token_iv" text,
	"access_token_key_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"tutorial_id" uuid,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"stage" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"audience" text DEFAULT 'intermediate' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_key_id" uuid,
	"models" jsonb NOT NULL,
	"budget_micros" bigint NOT NULL,
	"spent_micros" bigint DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"heartbeat_at" timestamp with time zone,
	"error_code" text,
	"error_detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"github_installation_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"account_login" text NOT NULL,
	"suspended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_github_installation_id_unique" UNIQUE("github_installation_id")
);
--> statement-breakpoint
CREATE TABLE "job_checkpoints" (
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"unit" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_checkpoints_job_id_stage_unit_pk" PRIMARY KEY("job_id","stage","unit")
);
--> statement-breakpoint
CREATE TABLE "job_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"type" text NOT NULL,
	"stage" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_llm_calls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"provider" "provider" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_stages" (
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "job_stages_job_id_stage_pk" PRIMARY KEY("job_id","stage")
);
--> statement-breakpoint
CREATE TABLE "learning_progress" (
	"user_id" text NOT NULL,
	"tutorial_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"lesson_key" text NOT NULL,
	"status" "lesson_status" NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_progress_user_id_version_id_lesson_key_pk" PRIMARY KEY("user_id","version_id","lesson_key")
);
--> statement-breakpoint
CREATE TABLE "model_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preset" text DEFAULT 'balanced' NOT NULL,
	"custom_models" jsonb,
	"default_budget_micros" bigint
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"job_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"user_id" text PRIMARY KEY NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "provider" NOT NULL,
	"label" text DEFAULT 'default' NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"encryption_key_version" integer NOT NULL,
	"last4" text NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"choice_key" text NOT NULL,
	"correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"github_repo_id" bigint NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"is_private" boolean NOT NULL,
	"default_branch" text NOT NULL,
	"license" text,
	CONSTRAINT "repositories_github_repo_id_unique" UNIQUE("github_repo_id")
);
--> statement-breakpoint
CREATE TABLE "repository_push_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repository_id" uuid NOT NULL,
	"commit_sha" text NOT NULL,
	"paths" text[] NOT NULL,
	"pushed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repository_id" uuid NOT NULL,
	"commit_sha" text NOT NULL,
	"analyzer_version" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stats" jsonb,
	"analysis" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot_file_edges" (
	"snapshot_id" uuid NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "snapshot_file_edges_snapshot_id_from_path_to_path_kind_pk" PRIMARY KEY("snapshot_id","from_path","to_path","kind")
);
--> statement-breakpoint
CREATE TABLE "snapshot_files" (
	"snapshot_id" uuid NOT NULL,
	"path" text NOT NULL,
	"blob_sha" text NOT NULL,
	"language" text,
	"size_bytes" integer NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "snapshot_files_snapshot_id_path_pk" PRIMARY KEY("snapshot_id","path")
);
--> statement-breakpoint
CREATE TABLE "snapshot_symbols" (
	"snapshot_id" uuid NOT NULL,
	"symbol_key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"exported" boolean DEFAULT false NOT NULL,
	"signature" text,
	CONSTRAINT "snapshot_symbols_snapshot_id_symbol_key_pk" PRIMARY KEY("snapshot_id","symbol_key")
);
--> statement-breakpoint
CREATE TABLE "tutorial_lessons" (
	"version_id" uuid NOT NULL,
	"chapter_key" text NOT NULL,
	"lesson_key" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "tutorial_lessons_version_id_lesson_key_pk" PRIMARY KEY("version_id","lesson_key")
);
--> statement-breakpoint
CREATE TABLE "tutorial_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tutorial_id" uuid NOT NULL,
	"reporter_user_id" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorial_source_refs" (
	"version_id" uuid NOT NULL,
	"lesson_key" text NOT NULL,
	"ref_id" text NOT NULL,
	"path" text NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"blob_sha" text NOT NULL,
	"symbol_key" text,
	CONSTRAINT "tutorial_source_refs_version_id_ref_id_pk" PRIMARY KEY("version_id","ref_id")
);
--> statement-breakpoint
CREATE TABLE "tutorial_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tutorial_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"schema_version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"audience" text NOT NULL,
	"content" jsonb,
	"validation_report" jsonb,
	"generator" jsonb NOT NULL,
	"generation_job_id" uuid,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"repository_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"share_token" text,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutorials_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"default_audience" text DEFAULT 'intermediate' NOT NULL,
	"auto_advance" boolean DEFAULT true NOT NULL,
	"quizzes_enabled" boolean DEFAULT true NOT NULL,
	"browser_notifications" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_repositories" (
	"user_id" text NOT NULL,
	"repository_id" uuid NOT NULL,
	"github_installation_id" bigint,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "user_repositories_user_id_repository_id_pk" PRIMARY KEY("user_id","repository_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"delivery_id" text NOT NULL,
	"event" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_snapshot_id_repository_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repository_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_provider_key_id_provider_keys_id_fk" FOREIGN KEY ("provider_key_id") REFERENCES "public"."provider_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_checkpoints" ADD CONSTRAINT "job_checkpoints_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_llm_calls" ADD CONSTRAINT "job_llm_calls_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_preferences" ADD CONSTRAINT "model_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_push_events" ADD CONSTRAINT "repository_push_events_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_snapshots" ADD CONSTRAINT "repository_snapshots_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_file_edges" ADD CONSTRAINT "snapshot_file_edges_snapshot_id_repository_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repository_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_files" ADD CONSTRAINT "snapshot_files_snapshot_id_repository_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repository_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_symbols" ADD CONSTRAINT "snapshot_symbols_snapshot_id_repository_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repository_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_lessons" ADD CONSTRAINT "tutorial_lessons_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_reports" ADD CONSTRAINT "tutorial_reports_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_reports" ADD CONSTRAINT "tutorial_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_source_refs" ADD CONSTRAINT "tutorial_source_refs_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_snapshot_id_repository_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repository_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_generation_job_id_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_current_version_id_tutorial_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repositories" ADD CONSTRAINT "user_repositories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repositories" ADD CONSTRAINT "user_repositories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_account_idx" ON "auth_identities" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_user_provider_idx" ON "auth_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_user_idem_idx" ON "generation_jobs" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_heartbeat_idx" ON "generation_jobs" USING btree ("status","heartbeat_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_user_created_idx" ON "generation_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "generation_jobs_status_finished_idx" ON "generation_jobs" USING btree ("status","finished_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_snapshot_idx" ON "generation_jobs" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_key_in_flight_idx" ON "generation_jobs" USING btree ("provider_key_id") WHERE "generation_jobs"."status" in ('queued', 'waiting_retry', 'stalled', 'running', 'canceling');--> statement-breakpoint
CREATE INDEX "github_installations_user_idx" ON "github_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_events_job_id_idx" ON "job_events" USING btree ("job_id","id");--> statement-breakpoint
CREATE INDEX "job_events_created_at_idx" ON "job_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "job_llm_calls_job_idx" ON "job_llm_calls" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_llm_calls_created_idx" ON "job_llm_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "learning_progress_user_tutorial_idx" ON "learning_progress" USING btree ("user_id","tutorial_id");--> statement-breakpoint
CREATE INDEX "learning_progress_user_status_updated_idx" ON "learning_progress" USING btree ("user_id","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_keys_user_provider_label_idx" ON "provider_keys" USING btree ("user_id","provider","label");--> statement-breakpoint
CREATE INDEX "provider_keys_user_idx" ON "provider_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_version_idx" ON "quiz_attempts" USING btree ("user_id","version_id");--> statement-breakpoint
CREATE INDEX "repositories_owner_name_idx" ON "repositories" USING btree ("owner","name");--> statement-breakpoint
CREATE INDEX "repositories_name_trgm_idx" ON "repositories" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "repositories_qualified_name_trgm_idx" ON "repositories" USING gin (("owner" || '/' || "name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "repository_push_events_repo_pushed_idx" ON "repository_push_events" USING btree ("repository_id","pushed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_snapshots_repo_sha_analyzer_idx" ON "repository_snapshots" USING btree ("repository_id","commit_sha","analyzer_version");--> statement-breakpoint
CREATE INDEX "repository_snapshots_repo_created_idx" ON "repository_snapshots" USING btree ("repository_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "snapshot_file_edges_to_idx" ON "snapshot_file_edges" USING btree ("snapshot_id","to_path");--> statement-breakpoint
CREATE INDEX "snapshot_files_lang_idx" ON "snapshot_files" USING btree ("snapshot_id","language");--> statement-breakpoint
CREATE INDEX "snapshot_files_blob_idx" ON "snapshot_files" USING btree ("blob_sha");--> statement-breakpoint
CREATE INDEX "snapshot_symbols_path_idx" ON "snapshot_symbols" USING btree ("snapshot_id","path");--> statement-breakpoint
CREATE INDEX "tutorial_lessons_title_trgm_idx" ON "tutorial_lessons" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tutorial_reports_tutorial_idx" ON "tutorial_reports" USING btree ("tutorial_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_reports_tutorial_reporter_uniq" ON "tutorial_reports" USING btree ("tutorial_id","reporter_user_id");--> statement-breakpoint
CREATE INDEX "tutorial_source_refs_path_idx" ON "tutorial_source_refs" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_versions_tutorial_no_idx" ON "tutorial_versions" USING btree ("tutorial_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_versions_generation_job_idx" ON "tutorial_versions" USING btree ("generation_job_id");--> statement-breakpoint
CREATE INDEX "tutorial_versions_snapshot_idx" ON "tutorial_versions" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorials_user_repo_idx" ON "tutorials" USING btree ("user_id","repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorials_repo_slug_idx" ON "tutorials" USING btree ("repository_id","slug");--> statement-breakpoint
CREATE INDEX "tutorials_visibility_idx" ON "tutorials" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "tutorials_title_trgm_idx" ON "tutorials" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_repositories_installation_idx" ON "user_repositories" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "user_repositories_active_idx" ON "user_repositories" USING btree ("user_id") WHERE "user_repositories"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_source_delivery_idx" ON "webhook_deliveries" USING btree ("source","delivery_id");