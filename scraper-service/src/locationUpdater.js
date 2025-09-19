const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

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
      // Use GB restaurants search endpoint
      const searchUrl = `https://guide.michelin.com/gb/en/restaurants?q=${encodeURIComponent(restaurantName)}`;

      console.log(`🔍 Searching Michelin Guide GB restaurants for: ${restaurantName}`);
      console.log(`🔧 DEBUG: Search URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Debug: Check page title and content
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`🔧 DEBUG: Page loaded - Title: "${pageTitle}", URL: ${pageUrl}`);

      // Debug: Check if we got blocked or redirected
      const pageContent = await page.content();
      if (pageContent.includes('blocked') || pageContent.includes('captcha') || pageContent.includes('security')) {
        console.log(`🔧 DEBUG: Possible blocking detected in page content`);
      }

      // Debug: Check what's actually on the page
      const debugInfo = await page.evaluate(() => {
        return {
          bodyText: document.body.innerText.substring(0, 1000),
          title: document.title,
          url: window.location.href,
          hasCards: document.querySelectorAll('.card__menu, .js-restaurant__list_item, .selection-card, .restaurant-card, .poi-card, .card').length,
          hasRestaurantLinks: document.querySelectorAll('a[href*="/restaurant/"]').length,
          allClassNames: Array.from(document.querySelectorAll('*')).map(el => el.className).filter(cn => cn && typeof cn === 'string').slice(0, 50)
        };
      });

      console.log(`🔧 DEBUG: Page analysis:`, debugInfo);

      // Take a screenshot for debugging (if needed)
      if (debugInfo.hasCards === 0 && debugInfo.hasRestaurantLinks === 0) {
        console.log(`🔧 DEBUG: No restaurant content found, this might be an issue`);
        // Could save screenshot here if needed: await page.screenshot({path: `/tmp/debug-${Date.now()}.png`});
      }

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

                // Get restaurant URL
                const linkElement = card.querySelector('a[href*="/restaurant/"], a[href*="/establishment/"]');
                const restaurantUrl = linkElement ?
                  (linkElement.getAttribute('href').startsWith('http') ?
                    linkElement.getAttribute('href') :
                    `https://guide.michelin.com${linkElement.getAttribute('href')}`) : null;

                console.log(`🔧 DEBUG: Found restaurant ${index + 1}: ${cardName}, Location: ${locationText}, Cuisine: ${cuisineText}`);

                matchedRestaurants.push({
                  name: cardName,
                  rawLocation: locationText,
                  cuisine: cuisineText,
                  url: restaurantUrl
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

      console.log(`✅ Found ${allRestaurantMatches.length} restaurant(s) for: ${restaurantName}`);

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
          rawLocation: match.rawLocation,
          url: match.url,
          isMainMatch: i === 0 // First match is used to update existing restaurant
        };

        processedRestaurants.push(processedRestaurant);
      }

      return {
        restaurants: processedRestaurants,
        totalFound: allRestaurantMatches.length
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

  async checkRestaurantDetails() {
    if (!this.browser) {
      await this.init();
    }

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

      // Find restaurants that have "Unknown City" or "Unknown Country"
      const restaurantsToCheck = await prisma.restaurant.findMany({
        where: {
          OR: [
            { city: 'Unknown City' },
            { country: 'Unknown Country' }
          ]
        },
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          cuisineType: true
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
                    await prisma.restaurant.create({
                      data: {
                        name: additionalMatch.name,
                        city: additionalMatch.city,
                        country: additionalMatch.country,
                        cuisineType: additionalMatch.cuisine || 'Contemporary',
                        michelinStars: 1, // Default to 1 star (could be refined later)
                        yearAwarded: new Date().getFullYear(),
                        address: additionalMatch.rawLocation || '',
                        latitude: null,
                        longitude: null,
                        description: `Michelin restaurant in ${additionalMatch.city}, ${additionalMatch.country}`,
                        imageUrl: null
                      }
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