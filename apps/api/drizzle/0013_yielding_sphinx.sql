UPDATE "tutorial_versions" SET "published_at" = now() WHERE "published_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tutorial_versions" ALTER COLUMN "published_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "generation_jobs_status_finished_idx" ON "generation_jobs" USING btree ("status","finished_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_key_in_flight_idx" ON "generation_jobs" USING btree ("key_id") WHERE "generation_jobs"."status" in ('queued', 'waiting_retry', 'stalled', 'running', 'canceling');--> statement-breakpoint
CREATE INDEX "job_events_at_idx" ON "job_events" USING btree ("at");