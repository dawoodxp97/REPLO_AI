DELETE FROM "tutorial_reports" a USING "tutorial_reports" b WHERE a."tutorial_id" = b."tutorial_id" AND a."reporter_id" = b."reporter_id" AND (a."created_at", a."id") > (b."created_at", b."id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_reports_tutorial_reporter_uniq" ON "tutorial_reports" USING btree ("tutorial_id","reporter_id");
