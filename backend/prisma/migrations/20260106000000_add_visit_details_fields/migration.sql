-- Add new fields to user_visits table for visit details
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "best_dish" TEXT;
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "occasion" TEXT;
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "mood_rating" INTEGER;
