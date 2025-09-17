const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedProductionDatabase() {
  console.log('🌱 Starting production database seeding...');

  try {
    // Read the scraped data
    const dataPath = path.join(__dirname, 'data', 'michelin-restaurants.json');

    if (!fs.existsSync(dataPath)) {
      console.error('❌ No scraped data found. Please run the scraper first:');
      console.error('   npm run scrape-michelin');
      process.exit(1);
    }

    const restaurantsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📊 Found ${restaurantsData.length} restaurants to seed`);

    // Clear existing restaurants (optional - be careful in production!)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('🗑️  Clearing existing restaurants...');
      await prisma.userVisit.deleteMany();
      await prisma.restaurant.deleteMany();
      console.log('✅ Existing data cleared');
    }

    // Seed restaurants in batches
    const batchSize = 50;
    let seededCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < restaurantsData.length; i += batchSize) {
      const batch = restaurantsData.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(restaurantsData.length / batchSize)}...`);

      for (const restaurant of batch) {
        try {
          // Check if restaurant already exists
          const existing = await prisma.restaurant.findFirst({
            where: {
              name: restaurant.name,
              city: restaurant.city,
              country: restaurant.country
            }
          });

          if (existing) {
            console.log(`⏭️  Skipping existing: ${restaurant.name}, ${restaurant.city}`);
            skippedCount++;
            continue;
          }

          // Create new restaurant
          await prisma.restaurant.create({
            data: {
              name: restaurant.name,
              city: restaurant.city,
              country: restaurant.country,
              cuisineType: restaurant.cuisineType,
              michelinStars: restaurant.michelinStars,
              yearAwarded: restaurant.yearAwarded,
              address: restaurant.address,
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
              description: restaurant.description,
              imageUrl: restaurant.imageUrl
            }
          });

          seededCount++;
          console.log(`✅ Added: ${restaurant.name}, ${restaurant.city} (${restaurant.michelinStars}⭐)`);

        } catch (error) {
          console.error(`❌ Error seeding ${restaurant.name}:`, error.message);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Seeded: ${seededCount} restaurants`);
    console.log(`   ⏭️  Skipped: ${skippedCount} existing restaurants`);
    console.log(`   📋 Total processed: ${restaurantsData.length} restaurants`);

    // Show breakdown by country and stars
    const stats = await prisma.restaurant.groupBy({
      by: ['country', 'michelinStars'],
      _count: {
        id: true
      }
    });

    console.log('\n📈 Database statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat.country}: ${stat._count.id} restaurants with ${stat.michelinStars}⭐`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (require.main === module) {
  console.log('🚀 Production Database Seeder');
  console.log('Usage: node seed-production.js [--clear]');
  console.log('  --clear: Clear existing restaurant data before seeding');
  console.log('');

  seedProductionDatabase()
    .then(() => {
      console.log('✅ Seeding finished successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedProductionDatabase };