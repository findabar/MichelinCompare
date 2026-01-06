-- Add new columns to user_visits table
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "best_dish" TEXT;
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "occasion" TEXT;
ALTER TABLE "user_visits" ADD COLUMN IF NOT EXISTS "mood_rating" INTEGER;
