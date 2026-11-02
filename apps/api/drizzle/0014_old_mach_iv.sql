CREATE INDEX "generation_jobs_snapshot_idx" ON "generation_jobs" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "learning_progress_user_status_updated_idx" ON "learning_progress" USING btree ("user_id","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "repositories_qualified_name_trgm_idx" ON "repositories" USING gin (("owner" || '/' || "name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_repositories_active_idx" ON "user_repositories" USING btree ("user_id") WHERE "user_repositories"."revoked_at" is null;