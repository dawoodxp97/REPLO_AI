ALTER TABLE "model_preferences" ADD COLUMN "default_budget_micros" bigint;--> statement-breakpoint
ALTER TABLE "model_preferences" DROP COLUMN "default_budget_usd";