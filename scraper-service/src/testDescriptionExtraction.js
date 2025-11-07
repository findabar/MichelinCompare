const { LocationUpdater } = require('./locationUpdater');

// Test description extraction
async function testDescriptionExtraction() {
  console.log('🧪 Testing description extraction from star classifications');
  console.log('='.repeat(80));

  const updater = new LocationUpdater();

  try {
    await updater.init();

    const testRestaurants = ['Le Bernardin', 'Gramercy Tavern']; // 3-star and 1-star

    for (const restaurantName of testRestaurants) {
      console.log(`\n🔍 Testing description extraction for: "${restaurantName}"`);
      console.log('-'.repeat(50));

      const result = await updater.searchRestaurantOnMichelin(restaurantName);

      if (result && result.restaurants && result.restaurants.length > 0) {
        const restaurant = result.restaurants[0];
        console.log('\n📊 Full Restaurant Details:');
        console.log('='.repeat(50));
        console.log(`   Name: "${restaurant.name}"`);
        console.log(`   City: "${restaurant.city}"`);
        console.log(`   Country: "${restaurant.country}"`);
        console.log(`   Cuisine: "${restaurant.cuisine}"`);
        console.log(`   Stars: ${restaurant.michelinStars}`);
        console.log(`   Description: "${restaurant.description || 'Not extracted'}"`);
        console.log(`   Street Address: "${restaurant.streetAddress || 'Not available'}"`);
        console.log(`   Phone: "${restaurant.phone || 'Not available'}"`);
        console.log(`   Website: "${restaurant.url || 'Not available'}"`);
        console.log(`   Michelin URL: "${restaurant.michelinUrl || 'Not available'}"`);
        console.log(`   Method: ${result.method}`);

        if (restaurant.description) {
          console.log('\n✅ Description extraction successful!');
        } else {
          console.log('\n⚠️  Description not extracted - check AI prompt');
        }
      } else {
        console.log('❌ No restaurants found');
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { success: true, message: 'All tests completed' };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
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

  testDescriptionExtraction()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Description extraction test completed!');
        process.exit(0);
      } else {
        console.log('\n❌ Description extraction test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Description extraction test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testDescriptionExtraction };