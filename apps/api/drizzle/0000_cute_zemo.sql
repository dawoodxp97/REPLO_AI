CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'waiting_retry', 'stalled', 'canceling', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('openrouter', 'anthropic', 'openai', 'google');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'link', 'public');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_edges" (
	"snapshot_id" uuid NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "file_edges_snapshot_id_from_path_to_path_kind_pk" PRIMARY KEY("snapshot_id","from_path","to_path","kind")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"tutorial_id" uuid,
	"kind" text NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"stage" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"audience" text DEFAULT 'intermediate' NOT NULL,
	"idempotency_key" text NOT NULL,
	"key_id" uuid,
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
CREATE TABLE "job_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"type" text NOT NULL,
	"stage" text,
	"data" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_stages" (
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"status" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"output_key" text,
	"output_hash" text,
	"started_at" timestamp with time zone,
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
	CONSTRAINT "learning_progress_user_id_version_id_lesson_key_pk" PRIMARY KEY("user_id","version_id","lesson_key")
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"provider" "provider" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"prompt_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preset" text DEFAULT 'balanced' NOT NULL,
	"custom_models" jsonb,
	"default_budget_usd" integer
);
--> statement-breakpoint
CREATE TABLE "provider_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "provider" NOT NULL,
	"label" text DEFAULT 'default' NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"key_version" integer NOT NULL,
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
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"repository_id" uuid NOT NULL,
	"commit_sha" text NOT NULL,
	"analyzer_version" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stats" jsonb,
	"artifact_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "symbols" (
	"snapshot_id" uuid NOT NULL,
	"symbol_key" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"exported" boolean DEFAULT false NOT NULL,
	"signature" text,
	CONSTRAINT "symbols_snapshot_id_symbol_key_pk" PRIMARY KEY("snapshot_id","symbol_key")
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
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tutorials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
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
CREATE TABLE "user_repositories" (
	"user_id" text NOT NULL,
	"repository_id" uuid NOT NULL,
	"installation_id" bigint,
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_edges" ADD CONSTRAINT "file_edges_snapshot_id_repo_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repo_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_snapshot_id_repo_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repo_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_key_id_provider_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."provider_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_stages" ADD CONSTRAINT "job_stages_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_preferences" ADD CONSTRAINT "model_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_snapshots" ADD CONSTRAINT "repo_snapshots_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_files" ADD CONSTRAINT "snapshot_files_snapshot_id_repo_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repo_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbols" ADD CONSTRAINT "symbols_snapshot_id_repo_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repo_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_source_refs" ADD CONSTRAINT "tutorial_source_refs_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_snapshot_id_repo_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."repo_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repositories" ADD CONSTRAINT "user_repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_repositories" ADD CONSTRAINT "user_repositories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_edges_to_idx" ON "file_edges" USING btree ("snapshot_id","to_path");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_user_idem_idx" ON "generation_jobs" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_heartbeat_idx" ON "generation_jobs" USING btree ("status","heartbeat_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_user_created_idx" ON "generation_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "github_installations_user_idx" ON "github_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_events_job_id_idx" ON "job_events" USING btree ("job_id","id");--> statement-breakpoint
CREATE INDEX "learning_progress_user_tutorial_idx" ON "learning_progress" USING btree ("user_id","tutorial_id");--> statement-breakpoint
CREATE INDEX "llm_calls_job_idx" ON "llm_calls" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "llm_calls_created_idx" ON "llm_calls" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_keys_user_provider_label_idx" ON "provider_keys" USING btree ("user_id","provider","label");--> statement-breakpoint
CREATE INDEX "provider_keys_user_idx" ON "provider_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_version_idx" ON "quiz_attempts" USING btree ("user_id","version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_snapshots_repo_sha_analyzer_idx" ON "repo_snapshots" USING btree ("repository_id","commit_sha","analyzer_version");--> statement-breakpoint
CREATE INDEX "repo_snapshots_repo_created_idx" ON "repo_snapshots" USING btree ("repository_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "repositories_owner_name_idx" ON "repositories" USING btree ("owner","name");--> statement-breakpoint
CREATE INDEX "snapshot_files_lang_idx" ON "snapshot_files" USING btree ("snapshot_id","language");--> statement-breakpoint
CREATE INDEX "snapshot_files_blob_idx" ON "snapshot_files" USING btree ("blob_sha");--> statement-breakpoint
CREATE INDEX "symbols_path_idx" ON "symbols" USING btree ("snapshot_id","path");--> statement-breakpoint
CREATE INDEX "tutorial_source_refs_path_idx" ON "tutorial_source_refs" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_versions_tutorial_no_idx" ON "tutorial_versions" USING btree ("tutorial_id","version_no");--> statement-breakpoint
CREATE INDEX "tutorial_versions_snapshot_idx" ON "tutorial_versions" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorials_user_slug_idx" ON "tutorials" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "tutorials_repo_idx" ON "tutorials" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "tutorials_visibility_idx" ON "tutorials" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "user_repositories_installation_idx" ON "user_repositories" USING btree ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_source_delivery_idx" ON "webhook_deliveries" USING btree ("source","delivery_id");