const { LocationUpdater } = require('./locationUpdater');

// Test star detection with different restaurants
async function testStarDetection() {
  console.log('🧪 Testing star detection across different restaurants');
  console.log('='.repeat(80));

  const updater = new LocationUpdater();
  const testRestaurants = [
    'Le Bernardin', // Should be 3 stars
    'Gramercy Tavern', // Should be 1 star
    'Eleven Madison Park' // Should be 3 stars
  ];

  try {
    await updater.init();

    for (const restaurantName of testRestaurants) {
      console.log(`\n🔍 Testing: "${restaurantName}"`);
      console.log('-'.repeat(50));

      const result = await updater.searchRestaurantOnMichelin(restaurantName);

      if (result && result.restaurants && result.restaurants.length > 0) {
        const restaurant = result.restaurants[0];
        console.log(`✅ Found: ${restaurant.name}`);
        console.log(`⭐ Stars: ${restaurant.michelinStars}`);
        console.log(`📍 Location: ${restaurant.city}, ${restaurant.country}`);
        console.log(`📊 Method: ${result.method}`);
      } else {
        console.log(`❌ Not found`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (updater.browser) {
      await updater.browser.close();
    }
  }
}

// Run the test if this file is called directly
if (require.main === module) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  testStarDetection()
    .then(() => {
      console.log('\n✅ Star detection test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Star detection test failed:', error);
      process.exit(1);
    });
}

module.exports = { testStarDetection };