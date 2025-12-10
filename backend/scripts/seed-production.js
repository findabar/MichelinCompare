const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedProductionDatabase() {
  console.log('🌱 Starting production database seeding...');

  try {
    // Read scraped data from raw_data table
    const restaurantsData = await prisma.rawData.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' }
    });

    if (restaurantsData.length === 0) {
      console.log('⚠️  No unprocessed scraped data found in raw_data table.');
      console.log('Please run the scraper first to populate raw_data.');
      process.exit(1);
    }

    console.log(`📊 Found ${restaurantsData.length} unprocessed restaurants to seed`);

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

      for (const rawData of batch) {
        try {
          // Check if restaurant already exists
          const existing = await prisma.restaurant.findFirst({
            where: {
              name: rawData.name,
              city: rawData.city,
              country: rawData.country
            }
          });

          const restaurantData = {
            name: rawData.name,
            city: rawData.city,
            country: rawData.country,
            cuisineType: rawData.cuisineType,
            michelinStars: rawData.michelinStars,
            distinction: rawData.distinction,
            yearAwarded: rawData.yearAwarded || 2024,
            address: rawData.address || '',
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            description: rawData.description,
            imageUrl: rawData.imageUrl,
            phone: rawData.phone,
            website: rawData.website,
            michelinUrl: rawData.michelinUrl
          };

          if (existing) {
            // Update existing restaurant with latest data
            await prisma.restaurant.update({
              where: { id: existing.id },
              data: restaurantData
            });
            console.log(`🔄 Updated: ${rawData.name}, ${rawData.city} (${rawData.michelinStars}⭐)`);
            skippedCount++;
          } else {
            // Create new restaurant
            await prisma.restaurant.create({
              data: restaurantData
            });
            console.log(`✅ Added: ${rawData.name}, ${rawData.city} (${rawData.michelinStars}⭐)`);
            seededCount++;
          }

          // Mark as processed after successful creation/update
          await prisma.rawData.update({
            where: { id: rawData.id },
            data: { processed: true }
          });

        } catch (error) {
          console.error(`❌ Error seeding ${rawData.name}:`, error.message);
        }
      }

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Added: ${seededCount} new restaurants`);
    console.log(`   🔄 Updated: ${skippedCount} existing restaurants`);
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