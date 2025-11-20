const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const OpenAI = require('openai');

const prisma = new PrismaClient();

// Initialize OpenAI client (lazy-loaded only if API key is available)
let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

class LocationUpdater {
  constructor() {
    this.browser = null;
  }

  async init() {
    console.log('🚀 Initializing browser for restaurant checking...');

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    console.log('✅ Browser initialized successfully');
  }

  async extractRestaurantDetailsWithAI(pageContent, restaurantName) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found, falling back to manual extraction');
        return null;
      }

      console.log(`🤖 Using OpenAI to extract restaurant details...`);

      // Filter out the "Nearby Restaurants" section to focus only on the specific restaurant
      let filteredContent = pageContent;
      const nearbyRestaurantsIndex = pageContent.indexOf('<h2 class="section__heading section__heading_title">\n                        Nearby Restaurants\n                    </h2>');
      if (nearbyRestaurantsIndex !== -1) {
        filteredContent = pageContent.substring(0, nearbyRestaurantsIndex);
        console.log(`🔧 DEBUG: Filtered out "Nearby Restaurants" section (${pageContent.length - filteredContent.length} characters removed)`);
      }

      // Strip all HTML tags and clean up the text
      const stripHtmlTags = (html) => {
        return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
          .trim();
      };

      const cleanContent = stripHtmlTags(filteredContent);
      console.log(`🔧 DEBUG: Stripped HTML tags (${filteredContent.length} → ${cleanContent.length} characters)`);

      const prompt = `You are analyzing a Michelin Guide restaurant search results page. Please extract restaurant information from the following text content.

Search Query: "${restaurantName}"

Text Content:
${cleanContent.substring(0, 8000)}

Please extract all restaurants that match or are similar to "${restaurantName}" and provide the information in the following JSON format:

{
  "restaurants": [
    {
      "name": "exact restaurant name",
      "city": "city name",
      "country": "country name",
      "cuisine": "cuisine type (e.g., French, Italian, Contemporary, etc.)",
      "michelinStars": 1,
      "description": "description text that follows the star classification",
      "streetAddress": "street address if available",
      "phone": "phone number if available",
      "url": "restaurant's own website URL if available",
      "michelinUrl": "full URL to restaurant page on Michelin Guide"
    }
  ]
}

Rules:
1. Only include restaurants that are clearly related to the search "${restaurantName}"
2. IGNORE any "Nearby Restaurants" or similar sections - focus only on the main restaurant details
3. Extract the city and country from the page content, URL structure, or make reasonable inferences
4. If cuisine type is not explicitly mentioned, make a reasonable inference based on the restaurant name/context
5. For Michelin stars, look for content in "data-sheet__classification-item--content" divs:
   - "One Star: High quality cooking" = 1 star
   - "Two Stars: Excellent cooking" = 2 stars
   - "Three Stars: Exceptional cuisine" = 3 stars
   - If no star classification found, default to 1
6. For description, extract the text that follows "One Star:", "Two Stars:", or "Three Stars:" (e.g., "High quality cooking", "Excellent cooking", "Exceptional cuisine")
7. Ensure all URLs are complete (start with https://)
8. Focus on extracting location information from the URLs if visible (e.g., /new-york-state/new-york/ suggests New York, United States)
9. For street address, look for the address text that appears directly under the restaurant name and above the cuisine type in the search results
10. Look for restaurant website URL and phone number in the page content
11. If street address/website/phone are not found, set them to null
12. The "url" field should be the restaurant's own website, "michelinUrl" should be the Michelin Guide page URL
13. Focus only on the primary restaurant being searched for, not related or nearby restaurants

Return only the JSON object, no additional text.`;

      const ai = getOpenAI();
      if (!ai) {
        console.log('⚠️  OpenAI client not available');
        return null;
      }

      const response = await ai.chat.completions.create({
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
      console.log(`🤖 OpenAI extraction successful`);

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
      console.error(`❌ OpenAI extraction failed:`, error.message);
      return null;
    }
  }

  async extractDetailsFromRestaurantPage(restaurantUrl) {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();

    try {
      console.log(`🔍 Loading restaurant detail page: ${restaurantUrl}`);

      // Set realistic browser headers
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      await page.goto(restaurantUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the page content for AI analysis
      const pageContent = await page.content();
      console.log(`📝 Detail page content length: ${pageContent.length} characters`);

      // Strip HTML tags for clean analysis
      const stripHtmlTags = (html) => {
        return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();
      };

      const cleanContent = stripHtmlTags(pageContent);
      console.log(`🔧 DEBUG: Stripped HTML tags (${pageContent.length} → ${cleanContent.length} characters)`);

      // Use AI to extract detailed information
      if (process.env.OPENAI_API_KEY) {
        const prompt = `You are analyzing a Michelin Guide restaurant detail page. Please extract the detailed contact information from the following text content.

Text Content:
${cleanContent.substring(0, 8000)}

Please extract and provide the information in the following JSON format:

{
  "streetAddress": "full street address if available",
  "phone": "phone number if available",
  "url": "restaurant's own website URL if available"
}

Rules:
1. Look for the full street address (street number, street name, city, postal code)
2. Look for phone number (usually starts with +, country code, or area code)
3. Look for restaurant website URL - it appears under a "visit website" button and starts with https:// (not the Michelin Guide URL)
4. The website URL typically appears just before the phone number in the page content
5. If any information is not found, set it to null
6. Ensure addresses are complete and properly formatted
7. Ensure phone numbers include country/area codes if visible
8. Ensure website URLs are complete and start with https://

Return only the JSON object, no additional text.`;

        try {
          const ai = getOpenAI();
          if (!ai) {
            console.log('⚠️  OpenAI client not available for detail extraction');
            return null;
          }

          const response = await ai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that extracts contact information from restaurant pages. Always respond with valid JSON only."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0,
            max_tokens: 500
          });

          const aiResponse = response.choices[0].message.content.trim();
          console.log(`🤖 Detail page AI extraction successful`);

          // Clean up the response if it has markdown formatting
          let cleanResponse = aiResponse;
          if (aiResponse.startsWith('```json')) {
            cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/\n?```/, '');
          } else if (aiResponse.startsWith('```')) {
            cleanResponse = aiResponse.replace(/```\n?/, '').replace(/\n?```/, '');
          }

          // Parse the JSON response
          const detailData = JSON.parse(cleanResponse);
          return detailData;

        } catch (error) {
          console.error(`❌ Detail page AI extraction failed:`, error.message);
          return null;
        }
      }

      return null;

    } catch (error) {
      console.error(`❌ Error loading restaurant detail page:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  async searchRestaurantOnMichelin(restaurantName) {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();

    // Set more realistic browser headers
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    try {
      // Always append "restaurant" to the search name
      const searchName = restaurantName.toLowerCase().includes('restaurant')
        ? restaurantName
        : `${restaurantName} restaurant`;

      // Use global restaurants search endpoint
      // Note: Client-side filtering for starred restaurants is applied after scraping
      const searchUrl = `https://guide.michelin.com/en/restaurants?q=${encodeURIComponent(searchName)}`;

      console.log(`🔍 Searching for: ${searchName}`);
      console.log(`🔧 Search URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for "no results" message
      const noResultsDetected = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        return bodyText.includes('Unfortunately there are no selected restaurants in the area you\'ve searched for.');
      });

      if (noResultsDetected) {
        console.log('⚠️ No restaurants found matching the search query');
        return null;
      }

      // Update restaurantName for the rest of the function
      restaurantName = searchName;

      // Debug: Check page title and content
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`🔧 DEBUG: Page loaded - Title: "${pageTitle}", URL: ${pageUrl}`);

      // Get the page content for AI analysis
      const pageContent = await page.content();
      console.log(`📝 Page content length: ${pageContent.length} characters`);

      // Try AI extraction first if OpenAI API key is available
      if (process.env.OPENAI_API_KEY) {
        console.log(`🤖 Attempting AI extraction for: ${restaurantName}`);
        const aiResult = await this.extractRestaurantDetailsWithAI(pageContent, restaurantName);

        if (aiResult && aiResult.restaurants && aiResult.restaurants.length > 0) {
          console.log(`✅ AI extraction successful! Found ${aiResult.restaurants.length} restaurant(s)`);

          // Enhanced processing: get detailed info from individual restaurant pages
          const processedRestaurants = [];

          for (let i = 0; i < aiResult.restaurants.length; i++) {
            const restaurant = aiResult.restaurants[i];
            let processedRestaurant = {
              name: restaurant.name,
              city: restaurant.city || 'Unknown City',
              country: restaurant.country || 'Unknown Country',
              cuisine: restaurant.cuisine || 'Contemporary',
              michelinStars: restaurant.michelinStars || 1,
              description: restaurant.description || null,
              streetAddress: restaurant.streetAddress || null,
              phone: restaurant.phone || null,
              url: restaurant.url || null, // Restaurant's own website
              michelinUrl: restaurant.michelinUrl || null, // Michelin Guide page URL
              isMainMatch: i === 0 // First match is used to update existing restaurant
            };

            // If we have a Michelin URL and no street address, try to get detailed info
            if (restaurant.michelinUrl && (!restaurant.streetAddress || restaurant.streetAddress === 'null')) {
              console.log(`🏠 Getting detailed address for: ${restaurant.name}`);
              const detailsFromPage = await this.extractDetailsFromRestaurantPage(restaurant.michelinUrl);

              if (detailsFromPage) {
                // Update with more detailed information
                processedRestaurant.streetAddress = detailsFromPage.streetAddress || processedRestaurant.streetAddress;
                processedRestaurant.phone = detailsFromPage.phone || processedRestaurant.phone;
                processedRestaurant.url = detailsFromPage.url || processedRestaurant.url;
                console.log(`✅ Enhanced details for ${restaurant.name}: address="${detailsFromPage.streetAddress}"`);
              }
            }

            processedRestaurants.push(processedRestaurant);
          }

          // Filter to only include restaurants with Michelin stars
          const starredRestaurants = processedRestaurants.filter(r => r.michelinStars !== null && r.michelinStars > 0);
          console.log(`🌟 Filtered to ${starredRestaurants.length} starred restaurants (removed ${processedRestaurants.length - starredRestaurants.length} without stars)`);

          return {
            restaurants: starredRestaurants,
            totalFound: starredRestaurants.length,
            method: 'AI+Details'
          };
        } else {
          console.log(`⚠️  AI extraction failed or returned no results, falling back to manual parsing`);
        }
      }

      // Fallback to manual HTML parsing if AI fails or API key not available
      console.log(`🔧 Falling back to manual HTML parsing for: ${restaurantName}`);

      // Look for restaurant cards in search results and extract all matching restaurants
      const allRestaurantMatches = await page.evaluate((searchName) => {
        console.log(`🔧 DEBUG: Starting page evaluation for: ${searchName}`);

        // Try different selectors for restaurant cards
        const possibleSelectors = [
          '.card__menu',
          '.js-restaurant__list_item',
          '.selection-card',
          '.restaurant-card',
          '.poi-card',
          '.card',
          'a[href*="/restaurant/"]'
        ];

        let cards = [];
        let foundSelector = null;

        console.log(`🔧 DEBUG: Testing selectors...`);
        for (const selector of possibleSelectors) {
          cards = document.querySelectorAll(selector);
          console.log(`🔧 DEBUG: Selector "${selector}" found ${cards.length} elements`);
          if (cards.length > 0) {
            foundSelector = selector;
            break;
          }
        }

        console.log(`🔧 DEBUG: Final result - Found ${cards.length} cards with selector: ${foundSelector}`);

        if (cards.length === 0) {
          console.log(`🔧 DEBUG: No cards found, returning empty array`);
          return [];
        }

        const matchedRestaurants = [];

        // Extract all restaurant cards that match our search
        cards.forEach((card, index) => {
          try {
            const nameElement = card.querySelector('h3, h2, .card__menu-content h3, .restaurant-name, .poi-name, .title');

            if (nameElement) {
              const cardName = nameElement.textContent.trim();

              // Check if this card matches our search (case insensitive, partial match)
              if (cardName.toLowerCase().includes(searchName.toLowerCase()) ||
                  searchName.toLowerCase().includes(cardName.toLowerCase())) {

                // Get location information
                const locationSelectors = [
                  '.card__menu-footer--location',
                  '.location',
                  '.address',
                  '.city',
                  '.poi-location',
                  '[data-location]',
                  '.card__menu-footer',
                  '.poi-address',
                  '.restaurant-location'
                ];

                let locationText = '';
                for (const sel of locationSelectors) {
                  const locationEl = card.querySelector(sel);
                  if (locationEl && locationEl.textContent?.trim()) {
                    locationText = locationEl.textContent.trim();
                    break;
                  }
                }

                // Get cuisine information
                const cuisineSelectors = [
                  '.card__menu-content--subtitle',
                  '.cuisine',
                  '.cuisine-type',
                  '.category',
                  '.poi-category',
                  '.card__menu-content .subtitle',
                  '.restaurant-cuisine'
                ];

                let cuisineText = '';
                for (const sel of cuisineSelectors) {
                  const cuisineEl = card.querySelector(sel);
                  if (cuisineEl && cuisineEl.textContent?.trim()) {
                    cuisineText = cuisineEl.textContent.trim();
                    break;
                  }
                }

                // Get restaurant URL (Michelin page)
                const linkElement = card.querySelector('a[href*="/restaurant/"], a[href*="/establishment/"]');
                const michelinUrl = linkElement ?
                  (linkElement.getAttribute('href').startsWith('http') ?
                    linkElement.getAttribute('href') :
                    `https://guide.michelin.com${linkElement.getAttribute('href')}`) : null;

                console.log(`🔧 DEBUG: Found restaurant ${index + 1}: ${cardName}, Location: ${locationText}, Cuisine: ${cuisineText}`);

                matchedRestaurants.push({
                  name: cardName,
                  rawLocation: locationText,
                  cuisine: cuisineText,
                  michelinUrl: michelinUrl
                });
              }
            }
          } catch (error) {
            console.log(`🔧 DEBUG: Error processing card ${index}:`, error.message);
          }
        });

        console.log(`🔧 DEBUG: Total matched restaurants: ${matchedRestaurants.length}`);
        return matchedRestaurants;
      }, restaurantName);

      if (!allRestaurantMatches || allRestaurantMatches.length === 0) {
        console.log(`⚠️  No restaurants found for: ${restaurantName}`);
        return null;
      }

      console.log(`✅ Found ${allRestaurantMatches.length} restaurant(s) for: ${restaurantName} (manual parsing)`);

      // Process all matches and return the first one with additional matches for database insertion
      const processedRestaurants = [];

      for (let i = 0; i < allRestaurantMatches.length; i++) {
        const match = allRestaurantMatches[i];
        console.log(`🔧 DEBUG: Processing match ${i + 1}: ${match.name}`);

        // Parse location
        const parsedLocation = this.parseLocation(match.rawLocation);

        const processedRestaurant = {
          name: match.name,
          city: parsedLocation.city,
          country: parsedLocation.country,
          cuisine: match.cuisine || 'Contemporary',
          michelinStars: 1, // Default for manual parsing
          streetAddress: null, // Not available in manual parsing
          phone: null, // Not available in manual parsing
          url: null, // Restaurant website not available in manual parsing
          michelinUrl: match.michelinUrl,
          isMainMatch: i === 0 // First match is used to update existing restaurant
        };

        processedRestaurants.push(processedRestaurant);
      }

      // Filter to only include restaurants with Michelin stars
      const starredRestaurants = processedRestaurants.filter(r => r.michelinStars !== null && r.michelinStars > 0);
      console.log(`🌟 Filtered to ${starredRestaurants.length} starred restaurants (removed ${processedRestaurants.length - starredRestaurants.length} without stars)`);

      return {
        restaurants: starredRestaurants,
        totalFound: starredRestaurants.length,
        method: 'manual'
      };

    } catch (error) {
      console.error(`❌ Error checking Michelin Guide for ${restaurantName}:`, error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  parseLocation(locationString) {
    // Clean up the location string
    let cleanLocation = locationString
      .replace(/^\s*[-•·]\s*/, '') // Remove leading bullets/dashes
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();

    let city = 'Unknown City';
    let country = 'Unknown Country';

    if (cleanLocation.includes(',')) {
      // Format: "City, Region, Country" or "City, Country"
      const parts = cleanLocation.split(',').map(p => p.trim()).filter(p => p);

      if (parts.length >= 2) {
        city = parts[0];
        country = parts[parts.length - 1];

        // If we have 3+ parts, check if the last part looks like a country
        if (parts.length >= 3) {
          const lastPart = parts[parts.length - 1].toLowerCase();
          const countryPatterns = [
            'france', 'italy', 'spain', 'germany', 'uk', 'united kingdom', 'usa', 'united states',
            'japan', 'singapore', 'hong kong', 'china', 'thailand', 'india', 'australia',
            'switzerland', 'austria', 'belgium', 'netherlands', 'portugal', 'sweden',
            'denmark', 'norway', 'canada', 'mexico', 'brazil', 'argentina', 'chile'
          ];

          if (countryPatterns.some(pattern => lastPart.includes(pattern))) {
            country = parts[parts.length - 1];
          }
        }
      }
    } else {
      // Single location string - try to parse or use as city
      city = cleanLocation;

      // Try to infer country from city name
      const locationLower = cleanLocation.toLowerCase();
      if (locationLower.includes('london') || locationLower.includes('birmingham') || locationLower.includes('manchester')) {
        country = 'United Kingdom';
      } else if (locationLower.includes('paris') || locationLower.includes('lyon') || locationLower.includes('marseille')) {
        country = 'France';
      } else if (locationLower.includes('tokyo') || locationLower.includes('osaka') || locationLower.includes('kyoto')) {
        country = 'Japan';
      } else if (locationLower.includes('new york') || locationLower.includes('chicago') || locationLower.includes('san francisco')) {
        country = 'United States';
      }
    }

    return { city, country };
  }

  async checkRestaurantDetails(options = {}) {
    if (!this.browser) {
      await this.init();
    }

    // Parse filtering options
    const {
      filterType = 'unknown', // 'all', 'unknown', 'stars', 'name'
      restaurantName = null,
      starLevel = null
    } = options;

    try {
      console.log('🔍 Finding restaurants with unknown locations or needing verification...');
      console.log('🔧 DEBUG: Database connection test...');

      // First, let's check the total number of restaurants
      const totalRestaurants = await prisma.restaurant.count();
      console.log(`🔧 DEBUG: Total restaurants in database: ${totalRestaurants}`);

      // Check for various patterns of unknown data
      const unknownCityCount = await prisma.restaurant.count({
        where: { city: 'Unknown City' }
      });
      const unknownCountryCount = await prisma.restaurant.count({
        where: { country: 'Unknown Country' }
      });

      console.log(`🔧 DEBUG: Restaurants with "Unknown City": ${unknownCityCount}`);
      console.log(`🔧 DEBUG: Restaurants with "Unknown Country": ${unknownCountryCount}`);

      // Let's also check for other variations
      const cityVariations = await prisma.restaurant.groupBy({
        by: ['city'],
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10
      });
      const countryVariations = await prisma.restaurant.groupBy({
        by: ['country'],
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10
      });

      console.log('🔧 DEBUG: Top 10 city values:');
      cityVariations.forEach(item => {
        console.log(`  "${item.city}": ${item._count.city} restaurants`);
      });

      console.log('🔧 DEBUG: Top 10 country values:');
      countryVariations.forEach(item => {
        console.log(`  "${item.country}": ${item._count.country} restaurants`);
      });

      // Build query based on filter type
      let whereClause = {};
      let filterDescription = '';

      switch (filterType) {
        case 'all':
          whereClause = {}; // No filter - get all restaurants
          filterDescription = 'all restaurants';
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
          filterDescription = `restaurants matching "${restaurantName}"`;
          break;

        case 'stars':
          if (!starLevel || ![1, 2, 3].includes(starLevel)) {
            throw new Error('Star level (1, 2, or 3) is required when filterType is "stars"');
          }
          whereClause = {
            michelinStars: starLevel
          };
          filterDescription = `${starLevel}-star restaurants`;
          break;

        case 'unknown':
        default:
          whereClause = {
            OR: [
              { city: 'Unknown City' },
              { country: 'Unknown Country' }
            ]
          };
          filterDescription = 'restaurants with unknown locations';
          break;
      }

      console.log(`🔍 Looking for ${filterDescription}...`);

      // Find restaurants based on filter
      const restaurantsToCheck = await prisma.restaurant.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          cuisineType: true,
          michelinStars: true
        }
      });

      console.log(`📊 Found ${restaurantsToCheck.length} restaurants needing verification`);

      if (restaurantsToCheck.length === 0) {
        // Test the Michelin search with a known restaurant to verify it's working
        console.log(`🔧 DEBUG: Testing Michelin search functionality with known restaurant...`);
        try {
          const testResult = await this.searchRestaurantOnMichelin('Le Bernardin');
          console.log(`🔧 DEBUG: Test search result:`, testResult);
        } catch (error) {
          console.log(`🔧 DEBUG: Test search failed:`, error.message);
        }

        return {
          success: true,
          total: 0,
          updated: 0,
          failed: 0,
          message: 'No restaurants with unknown locations found'
        };
      }

      let updatedCount = 0;
      let failedCount = 0;
      const updateSummary = [];

      for (let i = 0; i < restaurantsToCheck.length; i++) {
        const restaurant = restaurantsToCheck[i];
        console.log(`\n🏪 Checking ${i + 1}/${restaurantsToCheck.length}: ${restaurant.name}`);

        try {
          console.log(`🔧 DEBUG: Current restaurant data:`, {
            id: restaurant.id,
            name: restaurant.name,
            city: restaurant.city,
            country: restaurant.country,
            cuisineType: restaurant.cuisineType
          });

          const michelinSearchResult = await this.searchRestaurantOnMichelin(restaurant.name);
          console.log(`🔧 DEBUG: Michelin search result:`, michelinSearchResult);

          if (michelinSearchResult && michelinSearchResult.restaurants && michelinSearchResult.restaurants.length > 0) {
            const mainMatch = michelinSearchResult.restaurants[0]; // First match for updating existing restaurant
            const additionalMatches = michelinSearchResult.restaurants.slice(1); // Additional matches to add as new restaurants

            // Update the existing restaurant
            const updateData = {};
            const changes = [];

            console.log(`🔧 DEBUG: Processing main match:`, mainMatch);

            // Update location only if current values are "Unknown"
            if (restaurant.city === 'Unknown City' && mainMatch.city !== 'Unknown City') {
              updateData.city = mainMatch.city;
              changes.push(`city: "${mainMatch.city}"`);
              console.log(`🔧 DEBUG: Will update city to "${mainMatch.city}"`);
            }

            if (restaurant.country === 'Unknown Country' && mainMatch.country !== 'Unknown Country') {
              updateData.country = mainMatch.country;
              changes.push(`country: "${mainMatch.country}"`);
              console.log(`🔧 DEBUG: Will update country to "${mainMatch.country}"`);
            }

            // Update cuisine if it's different and we found a valid one
            if (mainMatch.cuisine &&
                mainMatch.cuisine !== restaurant.cuisineType &&
                mainMatch.cuisine.toLowerCase() !== 'cuisine' &&
                mainMatch.cuisine.length > 2) {
              updateData.cuisineType = mainMatch.cuisine;
              changes.push(`cuisine: "${restaurant.cuisineType}" → "${mainMatch.cuisine}"`);
              console.log(`🔧 DEBUG: Will update cuisine to "${mainMatch.cuisine}"`);
            }

            // Update additional fields if available from AI extraction
            if (mainMatch.streetAddress && mainMatch.streetAddress !== 'null') {
              updateData.address = mainMatch.streetAddress;
              changes.push(`address: "${mainMatch.streetAddress}"`);
              console.log(`🔧 DEBUG: Will update address to "${mainMatch.streetAddress}"`);
            }

            // Always update these fields from Michelin if different and valid
            if (mainMatch.phone && mainMatch.phone !== 'null' && mainMatch.phone !== restaurant.phone) {
              updateData.phone = mainMatch.phone;
              changes.push(`phone: "${restaurant.phone || 'null'}" → "${mainMatch.phone}"`);
              console.log(`🔧 DEBUG: Will update phone to "${mainMatch.phone}"`);
            }

            if (mainMatch.url && mainMatch.url !== 'null' && mainMatch.url !== restaurant.website) {
              updateData.website = mainMatch.url;
              changes.push(`website: "${restaurant.website || 'null'}" → "${mainMatch.url}"`);
              console.log(`🔧 DEBUG: Will update website to "${mainMatch.url}"`);
            }

            if (mainMatch.michelinUrl && mainMatch.michelinUrl !== 'null' && mainMatch.michelinUrl !== restaurant.michelinUrl) {
              updateData.michelinUrl = mainMatch.michelinUrl;
              changes.push(`michelin URL: "${restaurant.michelinUrl || 'null'}" → "${mainMatch.michelinUrl}"`);
              console.log(`🔧 DEBUG: Will update Michelin URL to "${mainMatch.michelinUrl}"`);
            }

            if (mainMatch.michelinStars && mainMatch.michelinStars !== restaurant.michelinStars) {
              updateData.michelinStars = mainMatch.michelinStars;
              changes.push(`stars: ${restaurant.michelinStars} → ${mainMatch.michelinStars}`);
              console.log(`🔧 DEBUG: Will update stars to ${mainMatch.michelinStars}`);
            }

            if (mainMatch.description && mainMatch.description !== 'null' && mainMatch.description !== restaurant.description) {
              updateData.description = mainMatch.description;
              changes.push(`description: "${restaurant.description ? restaurant.description.substring(0, 50) + '...' : 'null'}" → "${mainMatch.description.substring(0, 50)}..."`);
              console.log(`🔧 DEBUG: Will update description`);
            }

            console.log(`🔧 DEBUG: Update data:`, updateData);

            if (Object.keys(updateData).length > 0) {
              console.log(`🔧 DEBUG: Executing database update for restaurant ID: ${restaurant.id}`);

              await prisma.restaurant.update({
                where: { id: restaurant.id },
                data: updateData
              });

              console.log(`🔧 DEBUG: Database update successful`);
              console.log(`✅ Updated ${restaurant.name}: ${changes.join(', ')}`);
              updateSummary.push({
                name: restaurant.name,
                changes: changes,
                url: mainMatch.url
              });
              updatedCount++;
            }

            // Add additional restaurant matches to the database
            if (additionalMatches.length > 0) {
              console.log(`🔧 DEBUG: Found ${additionalMatches.length} additional restaurant(s) to add`);

              for (const additionalMatch of additionalMatches) {
                try {
                  // Check if this restaurant already exists (name + location uniqueness)
                  const existing = await prisma.restaurant.findFirst({
                    where: {
                      name: additionalMatch.name,
                      city: additionalMatch.city,
                      country: additionalMatch.country
                    }
                  });

                  if (!existing) {
                    const newRestaurantData = {
                      name: additionalMatch.name,
                      city: additionalMatch.city,
                      country: additionalMatch.country,
                      cuisineType: additionalMatch.cuisine || 'Contemporary',
                      michelinStars: additionalMatch.michelinStars || 1,
                      yearAwarded: new Date().getFullYear(),
                      address: additionalMatch.streetAddress || additionalMatch.rawLocation || '',
                      latitude: null,
                      longitude: null,
                      description: additionalMatch.description || `Michelin restaurant in ${additionalMatch.city}, ${additionalMatch.country}`,
                      imageUrl: null
                    };

                    // Add additional fields if available from AI extraction
                    if (additionalMatch.phone && additionalMatch.phone !== 'null') {
                      newRestaurantData.phone = additionalMatch.phone;
                    }
                    if (additionalMatch.url && additionalMatch.url !== 'null') {
                      newRestaurantData.website = additionalMatch.url;
                    }
                    if (additionalMatch.michelinUrl && additionalMatch.michelinUrl !== 'null') {
                      newRestaurantData.michelinUrl = additionalMatch.michelinUrl;
                    }

                    await prisma.restaurant.create({
                      data: newRestaurantData
                    });

                    console.log(`➕ Added new restaurant: ${additionalMatch.name} in ${additionalMatch.city}, ${additionalMatch.country}`);
                    updateSummary.push({
                      name: additionalMatch.name,
                      changes: [`added new restaurant in ${additionalMatch.city}, ${additionalMatch.country}`],
                      url: additionalMatch.url,
                      isNew: true
                    });
                  } else {
                    console.log(`⏭️  Restaurant already exists: ${additionalMatch.name} in ${additionalMatch.city}`);
                  }
                } catch (addError) {
                  console.error(`❌ Error adding new restaurant ${additionalMatch.name}:`, addError.message);
                }
              }
            }

            if (Object.keys(updateData).length === 0 && additionalMatches.length === 0) {
              console.log(`⏭️  No updates or additions needed for ${restaurant.name}`);
            }
          } else {
            console.log(`⏭️  Skipping ${restaurant.name}: not found on Michelin Guide`);
            failedCount++;
          }

          // Add delay between requests to be respectful to Michelin's servers
          await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
          console.error(`❌ Error checking ${restaurant.name}:`, error.message);
          failedCount++;
        }
      }

      console.log('\n🎉 Restaurant verification completed!');
      console.log(`📊 Summary:`);
      console.log(`   ✅ Updated: ${updatedCount} restaurants`);
      console.log(`   ❌ Failed/Not Found: ${failedCount} restaurants`);
      console.log(`   📋 Total checked: ${restaurantsToCheck.length} restaurants`);

      if (updateSummary.length > 0) {
        console.log('\n📝 Update Details:');
        updateSummary.forEach(update => {
          console.log(`   • ${update.name}: ${update.changes.join(', ')}`);
        });
      }

      return {
        success: true,
        total: restaurantsToCheck.length,
        updated: updatedCount,
        failed: failedCount,
        updateDetails: updateSummary,
        message: `Updated ${updatedCount} restaurants, ${failedCount} failed/not found`
      };

    } catch (error) {
      console.error('❌ Restaurant verification process failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      await prisma.$disconnect();
    }
  }
}

// Run location updater if called directly
if (require.main === module) {
  const updater = new LocationUpdater();
  updater.checkRestaurantDetails()
    .then((result) => {
      console.log('✅ Restaurant verification finished successfully!', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Restaurant verification failed:', error);
      process.exit(1);
    });
}

module.exports = { LocationUpdater };