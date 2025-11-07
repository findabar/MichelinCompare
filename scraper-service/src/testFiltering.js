const { LocationUpdater } = require('./locationUpdater');

// Test different filtering options
async function testFiltering() {
  console.log('🧪 Testing location update filtering options');
  console.log('='.repeat(80));

  const updater = new LocationUpdater();

  const testCases = [
    {
      name: 'Filter by restaurant name',
      options: { filterType: 'name', restaurantName: 'Bernardin' }
    },
    {
      name: 'Filter by 3-star restaurants',
      options: { filterType: 'stars', starLevel: 3 }
    },
    {
      name: 'Filter by 1-star restaurants',
      options: { filterType: 'stars', starLevel: 1 }
    },
    {
      name: 'Filter unknown locations (default)',
      options: { filterType: 'unknown' }
    }
  ];

  try {
    await updater.init();

    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log('-'.repeat(50));
      console.log(`Options:`, testCase.options);

      try {
        // Test the database query logic without running the full update
        const result = await testDatabaseQuery(testCase.options);
        console.log(`✅ Found ${result.count} restaurants to process`);

        if (result.count > 0 && result.count <= 5) {
          console.log('📋 Sample restaurants:');
          result.sample.forEach((restaurant, i) => {
            console.log(`   ${i + 1}. ${restaurant.name} (${restaurant.michelinStars} stars) - ${restaurant.city}, ${restaurant.country}`);
          });
        } else if (result.count > 5) {
          console.log('📋 First 3 restaurants:');
          result.sample.slice(0, 3).forEach((restaurant, i) => {
            console.log(`   ${i + 1}. ${restaurant.name} (${restaurant.michelinStars} stars) - ${restaurant.city}, ${restaurant.country}`);
          });
          console.log(`   ... and ${result.count - 3} more`);
        }

      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (updater.browser) {
      await updater.browser.close();
    }
  }
}

// Helper function to test database queries without running full update
async function testDatabaseQuery(options) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const { filterType = 'unknown', restaurantName = null, starLevel = null } = options;

    // Build query based on filter type (same logic as in checkRestaurantDetails)
    let whereClause = {};

    switch (filterType) {
      case 'all':
        whereClause = {};
        break;

      case 'name':
        if (!restaurantName) {
          throw new Error('Restaurant name is required when filterType is "name"');
        }
        whereClause = {
          name: {
            contains: restaurantName,
            mode: 'insensitive'
          }
        };
        break;

      case 'stars':
        if (!starLevel || ![1, 2, 3].includes(starLevel)) {
          throw new Error('Star level (1, 2, or 3) is required when filterType is "stars"');
        }
        whereClause = {
          michelinStars: starLevel
        };
        break;

      case 'unknown':
      default:
        whereClause = {
          OR: [
            { city: 'Unknown City' },
            { country: 'Unknown Country' }
          ]
        };
        break;
    }

    // Get count and sample
    const count = await prisma.restaurant.count({ where: whereClause });
    const sample = await prisma.restaurant.findMany({
      where: whereClause,
      select: {
        name: true,
        city: true,
        country: true,
        michelinStars: true
      },
      take: 5
    });

    return { count, sample };

  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is called directly
if (require.main === module) {
  testFiltering()
    .then(() => {
      console.log('\n✅ Filtering test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Filtering test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFiltering };