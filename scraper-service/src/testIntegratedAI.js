const { LocationUpdater } = require('./locationUpdater');

// Test the integrated AI functionality in the main LocationUpdater
async function testIntegratedAI() {
  console.log('🧪 Testing integrated AI extraction in main LocationUpdater class');
  console.log('='.repeat(80));

  const updater = new LocationUpdater();

  try {
    await updater.init();

    // Test with a known restaurant
    const restaurantName = 'Le Bernardin';
    console.log(`🔍 Testing search for: "${restaurantName}"`);

    const result = await updater.searchRestaurantOnMichelin(restaurantName);

    console.log('\n📊 Search Result:');
    console.log('='.repeat(50));

    if (result && result.restaurants && result.restaurants.length > 0) {
      console.log(`✅ Success! Found ${result.restaurants.length} restaurant(s)`);
      console.log(`📍 Method used: ${result.method}`);

      result.restaurants.forEach((restaurant, i) => {
        console.log(`\n${i + 1}. Restaurant Details:`);
        console.log(`   Name: "${restaurant.name}"`);
        console.log(`   City: "${restaurant.city}"`);
        console.log(`   Country: "${restaurant.country}"`);
        console.log(`   Cuisine: "${restaurant.cuisine}"`);
        console.log(`   Stars: ${restaurant.michelinStars}`);
        console.log(`   Street Address: "${restaurant.streetAddress || 'Not available'}"`);
        console.log(`   Phone: "${restaurant.phone || 'Not available'}"`);
        console.log(`   Website: "${restaurant.url || 'Not available'}"`);
        console.log(`   Michelin URL: "${restaurant.michelinUrl || 'Not available'}"`);
        console.log(`   Is Main Match: ${restaurant.isMainMatch}`);
      });

      console.log('\n🎉 AI integration test completed successfully!');
      return { success: true, result };
    } else {
      console.log('❌ No restaurants found');
      return { success: false, error: 'No restaurants found' };
    }

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
    console.log('💡 Please set your OpenAI API key:');
    console.log('   export OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  testIntegratedAI()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Integration test passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Integration test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Integration test crashed:', error);
      process.exit(1);
    });
}

module.exports = { testIntegratedAI };