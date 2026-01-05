-- Drop the unique constraint on user_id and restaurant_id
DROP INDEX IF EXISTS "user_visits_userId_restaurantId_key";

-- Add composite index for query performance
CREATE INDEX IF NOT EXISTS "user_visits_userId_restaurantId_idx" ON "user_visits"("user_id", "restaurant_id");
