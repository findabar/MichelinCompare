-- CreateTable
CREATE TABLE "raw_data" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "cuisine_type" TEXT NOT NULL,
    "michelin_stars" INTEGER NOT NULL,
    "year_awarded" INTEGER,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "image_url" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "michelin_url" TEXT,
    "distinction" TEXT,
    "scrape_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_data_processed_idx" ON "raw_data"("processed");

-- CreateIndex
CREATE INDEX "raw_data_scrape_date_idx" ON "raw_data"("scrape_date");
