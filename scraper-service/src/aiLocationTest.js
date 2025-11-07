const { LocationUpdater } = require('./locationUpdater');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Make sure to set this environment variable
});

class AILocationTester extends LocationUpdater {

  async extractRestaurantDetailsWithAI(pageContent, restaurantName) {
    try {
      console.log(`🤖 Using OpenAI to extract restaurant details...`);

      const prompt = `You are analyzing a Michelin Guide restaurant search results page. Please extract restaurant information from the following HTML content.

Search Query: "${restaurantName}"

HTML Content:
${pageContent.substring(0, 15000)} // Truncate to avoid token limits

Please extract all restaurants that match or are similar to "${restaurantName}" and provide the information in the following JSON format:

{
  "restaurants": [
    {
      "name": "exact restaurant name",
      "city": "city name",
      "country": "country name",
      "cuisine": "cuisine type (e.g., French, Italian, Contemporary, etc.)",
      "michelinStars": 1,
      "streetAddress": "street address if available",
      "phone": "phone number if available",
      "url": "restaurant's own website URL if available",
      "michelinUrl": "full URL to restaurant page on Michelin Guide"
    }
  ]
}

Rules:
1. Only include restaurants that are clearly related to the search "${restaurantName}"
2. Extract the city and country from the page content, URL structure, or make reasonable inferences
3. If cuisine type is not explicitly mentioned, make a reasonable inference based on the restaurant name/context
4. If Michelin stars are not clear, default to 1
5. Ensure all URLs are complete (start with https://)
6. Focus on extracting location information from the URLs if visible (e.g., /new-york-state/new-york/ suggests New York, United States)
7. Look for street address, restaurant website URL, and phone number in the page content
8. If street address/website/phone are not found, set them to null
9. The "url" field should be the restaurant's own website, "michelinUrl" should be the Michelin Guide page URL

Return only the JSON object, no additional text.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts structured restaurant data from Michelin Guide pages. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 1500
      });

      const aiResponse = response.choices[0].message.content.trim();
      console.log(`🤖 OpenAI Raw Response:`, aiResponse);

      // Clean up the response if it has markdown formatting
      let cleanResponse = aiResponse;
      if (aiResponse.startsWith('```json')) {
        cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/\n?```/, '');
      } else if (aiResponse.startsWith('```')) {
        cleanResponse = aiResponse.replace(/```\n?/, '').replace(/\n?```/, '');
      }

      // Parse the JSON response
      const restaurantData = JSON.parse(cleanResponse);

      return restaurantData;

    } catch (error) {
      console.error(`❌ OpenAI extraction failed:`, error);
      return { restaurants: [] };
    }
  }

  async testSingleRestaurantWithAI(restaurantName) {
    console.log(`🧪 Testing AI-powered location extraction for: "${restaurantName}"`);
    console.log('='.repeat(80));

    try {
      await this.init();

      // Use GB restaurants search endpoint
      const searchUrl = `https://guide.michelin.com/gb/en/restaurants?q=${encodeURIComponent(restaurantName)}`;
      console.log(`🔍 Testing URL: ${searchUrl}`);

      const page = await this.browser.newPage();

      // Set realistic browser headers
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get page info
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyLength: document.body.innerText.length
        };
      });

      console.log(`📄 Page Info:`, pageInfo);

      // Get the page content for AI analysis
      const pageContent = await page.content();
      console.log(`📝 Page content length: ${pageContent.length} characters`);

      // Extract with OpenAI
      const aiResults = await this.extractRestaurantDetailsWithAI(pageContent, restaurantName);

      console.log(`\n🤖 AI Extraction Results:`);
      console.log('='.repeat(50));

      if (aiResults && aiResults.restaurants && aiResults.restaurants.length > 0) {
        aiResults.restaurants.forEach((restaurant, i) => {
          console.log(`\n${i + 1}. AI Extracted Restaurant:`);
          console.log(`   Name: "${restaurant.name}"`);
          console.log(`   City: "${restaurant.city}"`);
          console.log(`   Country: "${restaurant.country}"`);
          console.log(`   Cuisine: "${restaurant.cuisine}"`);
          console.log(`   Stars: ${restaurant.michelinStars}`);
          console.log(`   Street Address: "${restaurant.streetAddress || 'Not found'}"`);
          console.log(`   Restaurant Website: "${restaurant.url || 'Not found'}"`);
          console.log(`   Phone: "${restaurant.phone || 'Not found'}"`);
          console.log(`   Michelin URL: "${restaurant.michelinUrl || 'Not found'}"`);
        });

        await page.close();

        return {
          success: true,
          restaurants: aiResults.restaurants,
          totalFound: aiResults.restaurants.length,
          method: 'OpenAI GPT-4o',
          pageInfo
        };
      } else {
        console.log(`❌ AI extraction returned no results`);
        await page.close();

        return {
          success: false,
          restaurants: [],
          totalFound: 0,
          method: 'OpenAI GPT-4o',
          pageInfo,
          error: 'No restaurants extracted by AI'
        };
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message,
        method: 'OpenAI GPT-4o'
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// CLI interface for testing
if (require.main === module) {
  const restaurantName = process.argv[2] || 'Le Bernardin';

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.log('💡 Please set your OpenAI API key:');
    console.log('   export OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log(`🧪 Starting AI-powered restaurant test for: "${restaurantName}"`);
  console.log(`💡 Usage: OPENAI_API_KEY=your_key node aiLocationTest.js "Restaurant Name"`);
  console.log('='.repeat(80));

  const tester = new AILocationTester();

  tester.testSingleRestaurantWithAI(restaurantName)
    .then(result => {
      console.log('\n✅ Test completed!');
      console.log('📊 Final Result:', JSON.stringify(result, null, 2));

      if (result.success && result.restaurants.length > 0) {
        console.log(`🎉 Successfully extracted ${result.restaurants.length} restaurant(s) using AI!`);
      } else {
        console.log(`😞 No restaurants found - check the error details above`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { AILocationTester };