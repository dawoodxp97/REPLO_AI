CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
DROP INDEX "lesson_index_title_idx";--> statement-breakpoint
CREATE INDEX "lesson_index_title_trgm_idx" ON "lesson_index" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "repositories_name_trgm_idx" ON "repositories" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tutorials_title_trgm_idx" ON "tutorials" USING gin ("title" gin_trgm_ops);