ALTER TABLE "job_stages" DROP COLUMN "output_key";--> statement-breakpoint
ALTER TABLE "job_stages" DROP COLUMN "output_hash";--> statement-breakpoint
ALTER TABLE "job_stages" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "llm_calls" DROP COLUMN "cached_input_tokens";--> statement-breakpoint
ALTER TABLE "llm_calls" DROP COLUMN "prompt_hash";--> statement-breakpoint
ALTER TABLE "repo_snapshots" DROP COLUMN "artifact_key";