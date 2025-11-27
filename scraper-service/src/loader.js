const { PrismaClient } = require('@prisma/client');
const MichelinScraper = require('./scraper');

const prisma = new PrismaClient();

/**
 * Loader function - Scrapes restaurants from Michelin star URLs
 * and populates the raw_data table
 * @param {number|number[]} starLevels - Optional star level(s) to scrape (1, 2, 3, or array). Defaults to all [3, 2, 1]
 */
async function loader(starLevels = [3, 2, 1]) {
  console.log('🚀 Starting Michelin restaurant loader...');

  // Normalize starLevels to array
  const levelsToScrape = Array.isArray(starLevels) ? starLevels : [starLevels];

  // Validate star levels
  const validLevels = levelsToScrape.filter(level => [1, 2, 3].includes(level));
  if (validLevels.length === 0) {
    throw new Error('Invalid star levels. Must be 1, 2, 3, or array of these values.');
  }

  const urls = {
    3: 'https://guide.michelin.com/en/restaurants/3-stars-michelin',
    2: 'https://guide.michelin.com/en/restaurants/2-stars-michelin',
    1: 'https://guide.michelin.com/en/restaurants/1-star-michelin'
  };

  console.log(`📋 Loading ${validLevels.join(', ')}-star restaurants...`);

  const scraper = new MichelinScraper();
  await scraper.init();

  try {
    // Loop through each specified star level URL
    for (const starLevel of validLevels) {
      const url = urls[starLevel];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🌟 Loading ${starLevel}-star restaurants from: ${url}`);
      console.log(`${'='.repeat(60)}\n`);

      await scraper.scrapeStarLevel(starLevel);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 All restaurants loaded successfully!');
    console.log(`📊 Total restaurants found: ${scraper.restaurants.length}`);
    console.log(`${'='.repeat(60)}\n`);

    // Save all restaurants to the raw_data table
    console.log('💾 Saving restaurants to raw_data table...');

    let savedCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (const restaurant of scraper.restaurants) {
      try {
        // Check if restaurant already exists in database
        const existing = await prisma.rawData.findFirst({
          where: {
            name: restaurant.name,
            city: restaurant.city,
            country: restaurant.country
          }
        });

        if (existing) {
          console.log(`⚠️  Skipping duplicate: ${restaurant.name} in ${restaurant.city}, ${restaurant.country}`);
          duplicateCount++;
          continue;
        }

        await prisma.rawData.create({
          data: {
            name: restaurant.name,
            city: restaurant.city,
            country: restaurant.country,
            cuisineType: restaurant.cuisineType || restaurant.cuisine || 'Unknown',
            michelinStars: restaurant.michelinStars,
            yearAwarded: restaurant.yearAwarded || null,
            address: restaurant.address || null,
            latitude: restaurant.latitude || null,
            longitude: restaurant.longitude || null,
            description: restaurant.description || null,
            imageUrl: restaurant.imageUrl || null,
            phone: restaurant.phone || null,
            website: restaurant.website || null,
            michelinUrl: restaurant.url || restaurant.michelinUrl || null,
            distinction: restaurant.distinction || null,
            processed: false
          }
        });
        savedCount++;
        console.log(`✅ Saved: ${restaurant.name} (${restaurant.michelinStars} stars) - ${restaurant.city}, ${restaurant.country}`);
      } catch (error) {
        console.error(`❌ Error saving ${restaurant.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📈 Loading Summary:');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Successfully saved: ${savedCount} restaurants`);
    console.log(`⚠️  Duplicates skipped: ${duplicateCount} restaurants`);
    if (errorCount > 0) {
      console.log(`❌ Errors encountered: ${errorCount} restaurants`);
    }

    // Breakdown by star level
    const breakdown = {
      '3-star': scraper.restaurants.filter(r => r.michelinStars === 3).length,
      '2-star': scraper.restaurants.filter(r => r.michelinStars === 2).length,
      '1-star': scraper.restaurants.filter(r => r.michelinStars === 1).length
    };

    console.log(`\n⭐ 3-star restaurants: ${breakdown['3-star']}`);
    console.log(`⭐ 2-star restaurants: ${breakdown['2-star']}`);
    console.log(`⭐ 1-star restaurants: ${breakdown['1-star']}`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      success: true,
      totalRestaurants: scraper.restaurants.length,
      savedCount,
      duplicateCount,
      errorCount,
      breakdown
    };

  } catch (error) {
    console.error('❌ Loader failed:', error);
    throw error;
  } finally {
    if (scraper.browser) {
      await scraper.browser.close();
      console.log('🔒 Browser closed');
    }
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

module.exports = { loader };
