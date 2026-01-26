-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "restaurants_visited_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "cuisine_type" TEXT NOT NULL,
    "michelin_stars" INTEGER NOT NULL,
    "distinction" TEXT,
    "year_awarded" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "image_url" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "michelin_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_visits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "date_visited" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_stars_per_day" INTEGER,
    "preferred_cuisines" TEXT[],
    "include_visited" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_plan_restaurants" (
    "id" TEXT NOT NULL,
    "travel_plan_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "meal_type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_plan_restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "restaurants_country_city_idx" ON "restaurants"("country", "city");

-- CreateIndex
CREATE INDEX "restaurants_michelin_stars_idx" ON "restaurants"("michelin_stars");

-- CreateIndex
CREATE INDEX "restaurants_cuisine_type_idx" ON "restaurants"("cuisine_type");

-- CreateIndex
CREATE INDEX "user_visits_user_id_idx" ON "user_visits"("user_id");

-- CreateIndex
CREATE INDEX "user_visits_restaurant_id_idx" ON "user_visits"("restaurant_id");

-- CreateIndex
CREATE INDEX "user_visits_user_id_restaurant_id_idx" ON "user_visits"("user_id", "restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "travel_plans_share_token_key" ON "travel_plans"("share_token");

-- CreateIndex
CREATE INDEX "travel_plans_user_id_idx" ON "travel_plans"("user_id");

-- CreateIndex
CREATE INDEX "travel_plans_city_idx" ON "travel_plans"("city");

-- CreateIndex
CREATE INDEX "travel_plans_share_token_idx" ON "travel_plans"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "travel_plan_restaurants_travel_plan_id_restaurant_id_key" ON "travel_plan_restaurants"("travel_plan_id", "restaurant_id");

-- CreateIndex
CREATE INDEX "travel_plan_restaurants_travel_plan_id_idx" ON "travel_plan_restaurants"("travel_plan_id");

-- CreateIndex
CREATE INDEX "travel_plan_restaurants_restaurant_id_idx" ON "travel_plan_restaurants"("restaurant_id");

-- AddForeignKey
ALTER TABLE "user_visits" ADD CONSTRAINT "user_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_visits" ADD CONSTRAINT "user_visits_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_plans" ADD CONSTRAINT "travel_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_plan_restaurants" ADD CONSTRAINT "travel_plan_restaurants_travel_plan_id_fkey" FOREIGN KEY ("travel_plan_id") REFERENCES "travel_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_plan_restaurants" ADD CONSTRAINT "travel_plan_restaurants_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
