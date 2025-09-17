# Michelin Restaurant Data Scripts

This directory contains scripts for scraping Michelin starred restaurants from the UK and US, and seeding them into the production database.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

## Usage

### 1. Scrape Restaurant Data

This will scrape Michelin starred restaurants from the UK and US and save them to `data/michelin-restaurants.json`:

```bash
npm run scrape
```

**What it does:**
- Scrapes 1, 2, and 3-star Michelin restaurants from UK and US
- Extracts: name, city, country, cuisine type, star level, address
- Saves data to `data/michelin-restaurants.json`
- Takes approximately 5-10 minutes to complete

### 2. Seed Production Database

After scraping, seed the data into your production database:

```bash
# Add new restaurants (skip existing ones)
npm run seed-production

# OR clear existing data and reseed everything
npm run seed-production-clear
```

### 3. Full Refresh

To scrape fresh data and completely refresh the database:

```bash
npm run full-refresh
```

## Railway Deployment

To run these scripts on Railway:

### Option 1: Run via Railway CLI
```bash
railway run npm run scrape
railway run npm run seed-production
```

### Option 2: Add as Railway Service Commands

Add these to your Railway service settings:

**Custom Start Command for scraping:**
```bash
cd backend/scripts && npm install && npm run scrape && npm run seed-production
```

## Files

- `scrape-michelin.js` - Main scraper using Puppeteer
- `seed-production.js` - Database seeding script
- `package.json` - Dependencies and scripts
- `data/` - Directory where scraped data is saved

## Data Structure

The scraper extracts restaurants with this structure:
```json
{
  "name": "Restaurant Name",
  "city": "City",
  "country": "United Kingdom" | "United States",
  "cuisineType": "Cuisine Type",
  "michelinStars": 1 | 2 | 3,
  "yearAwarded": 2024,
  "address": "Full Address",
  "latitude": null,
  "longitude": null,
  "description": "Description",
  "imageUrl": null
}
```

## Notes

- The scraper is respectful and includes delays to avoid overloading the Michelin website
- Existing restaurants are skipped when seeding to avoid duplicates
- The scraper may need updates if the Michelin website structure changes
- Data accuracy depends on what's available on the Michelin Guide website

## Troubleshooting

**Puppeteer issues on Railway:**
- Railway includes Chrome, so Puppeteer should work without additional setup
- If you encounter issues, try adding `--no-sandbox --disable-setuid-sandbox` flags

**Memory issues:**
- The scraper processes data in batches to avoid memory problems
- Adjust `batchSize` in the seeding script if needed

**Database connection:**
- Ensure your `DATABASE_URL` environment variable is set correctly
- The seeding script uses the same Prisma client as your main application