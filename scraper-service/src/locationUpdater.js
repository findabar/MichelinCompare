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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      // Search on Michelin Guide website
      const searchUrl = `https://guide.michelin.com/en/search?q=${encodeURIComponent(restaurantName)}`;

      console.log(`🔍 Searching Michelin Guide for: ${restaurantName}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Look for restaurant cards in search results
      const restaurantDetails = await page.evaluate((searchName) => {
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

        for (const selector of possibleSelectors) {
          cards = document.querySelectorAll(selector);
          if (cards.length > 0) {
            foundSelector = selector;
            break;
          }
        }

        if (cards.length === 0) {
          return null;
        }

        // Find the best matching restaurant card
        for (const card of cards) {
          const nameElement = card.querySelector('h3, h2, .card__menu-content h3, .restaurant-name, .poi-name, .title');

          if (nameElement) {
            const cardName = nameElement.textContent.trim();

            // Check if this card matches our search (case insensitive, partial match)
            if (cardName.toLowerCase().includes(searchName.toLowerCase()) ||
                searchName.toLowerCase().includes(cardName.toLowerCase())) {

              // Get the restaurant URL for detailed page
              const linkElement = card.querySelector('a[href*="/restaurant/"], a[href*="/establishment/"]');

              if (linkElement) {
                const href = linkElement.getAttribute('href');
                const fullUrl = href.startsWith('http') ? href : `https://guide.michelin.com${href}`;

                return {
                  name: cardName,
                  url: fullUrl,
                  found: true
                };
              }
            }
          }
        }

        return null;
      }, restaurantName);

      if (!restaurantDetails) {
        console.log(`⚠️  Restaurant not found on Michelin Guide: ${restaurantName}`);
        return null;
      }

      console.log(`✅ Found restaurant on Michelin Guide: ${restaurantDetails.name}`);
      console.log(`🔗 Restaurant URL: ${restaurantDetails.url}`);

      // Now visit the restaurant's detailed page
      await page.goto(restaurantDetails.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract location and cuisine from the restaurant page
      const pageDetails = await page.evaluate(() => {
        // Look for restaurant name (usually in h1 or main heading)
        const nameElement = document.querySelector('h1, .restaurant-name, .poi-name, .page-title');
        const name = nameElement ? nameElement.textContent.trim() : null;

        // Look for location/address information (usually right after the name)
        const locationSelectors = [
          '.restaurant-details__location',
          '.poi-address',
          '.address',
          '.location',
          '.restaurant-location',
          '.card__menu-footer--location',
          '[data-restaurant-address]',
          '.restaurant-address'
        ];

        let location = null;
        for (const selector of locationSelectors) {
          const locationElement = document.querySelector(selector);
          if (locationElement && locationElement.textContent.trim()) {
            location = locationElement.textContent.trim();
            break;
          }
        }

        // If no specific location element, try to find address-like text near the restaurant name
        if (!location) {
          const possibleAddressElements = document.querySelectorAll('div, p, span');
          for (const element of possibleAddressElements) {
            const text = element.textContent.trim();
            // Look for address-like patterns (contains comma, reasonable length)
            if (text.includes(',') && text.length > 10 && text.length < 200 &&
                !text.includes('Michelin') && !text.includes('stars') &&
                !text.includes('restaurant') && !text.toLowerCase().includes('cuisine')) {
              location = text;
              break;
            }
          }
        }

        // Look for cuisine type information
        const cuisineSelectors = [
          '.restaurant-details__cuisine',
          '.cuisine-type',
          '.cuisine',
          '.category',
          '.poi-category',
          '.card__menu-content--subtitle',
          '.restaurant-cuisine',
          '[data-restaurant-cuisine]'
        ];

        let cuisine = null;
        for (const selector of cuisineSelectors) {
          const cuisineElement = document.querySelector(selector);
          if (cuisineElement && cuisineElement.textContent.trim()) {
            cuisine = cuisineElement.textContent.trim();
            break;
          }
        }

        // If no specific cuisine element, look for cuisine-related text
        if (!cuisine) {
          const textElements = document.querySelectorAll('div, p, span');
          for (const element of textElements) {
            const text = element.textContent.trim();
            // Look for common cuisine patterns
            if ((text.includes('cuisine') || text.includes('Cuisine')) && text.length < 100) {
              cuisine = text.replace(/cuisine/gi, '').replace(/\s+/g, ' ').trim();
              if (cuisine.length > 0) break;
            }
          }
        }

        return {
          name,
          location,
          cuisine,
          pageUrl: window.location.href
        };
      });

      if (pageDetails.location) {
        // Parse location to extract city and country
        const parsedLocation = this.parseLocation(pageDetails.location);

        return {
          name: pageDetails.name,
          city: parsedLocation.city,
          country: parsedLocation.country,
          cuisine: pageDetails.cuisine,
          rawLocation: pageDetails.location,
          url: pageDetails.pageUrl
        };
      } else {
        console.log(`⚠️  No location found on restaurant page for: ${restaurantName}`);
        return null;
      }

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

          const michelinDetails = await this.searchRestaurantOnMichelin(restaurant.name);
          console.log(`🔧 DEBUG: Michelin search result:`, michelinDetails);

          if (michelinDetails) {
            const updateData = {};
            const changes = [];

            console.log(`🔧 DEBUG: Checking city update condition:`);
            console.log(`  Current city: "${restaurant.city}"`);
            console.log(`  Found city: "${michelinDetails.city}"`);
            console.log(`  City === "Unknown City": ${restaurant.city === 'Unknown City'}`);
            console.log(`  Found city !== "Unknown City": ${michelinDetails.city !== 'Unknown City'}`);

            // Update location only if current values are "Unknown"
            if (restaurant.city === 'Unknown City' && michelinDetails.city !== 'Unknown City') {
              updateData.city = michelinDetails.city;
              changes.push(`city: "${michelinDetails.city}"`);
              console.log(`🔧 DEBUG: Will update city to "${michelinDetails.city}"`);
            }

            console.log(`🔧 DEBUG: Checking country update condition:`);
            console.log(`  Current country: "${restaurant.country}"`);
            console.log(`  Found country: "${michelinDetails.country}"`);
            console.log(`  Country === "Unknown Country": ${restaurant.country === 'Unknown Country'}`);
            console.log(`  Found country !== "Unknown Country": ${michelinDetails.country !== 'Unknown Country'}`);

            if (restaurant.country === 'Unknown Country' && michelinDetails.country !== 'Unknown Country') {
              updateData.country = michelinDetails.country;
              changes.push(`country: "${michelinDetails.country}"`);
              console.log(`🔧 DEBUG: Will update country to "${michelinDetails.country}"`);
            }

            // Update cuisine if it's different and we found a valid one
            if (michelinDetails.cuisine &&
                michelinDetails.cuisine !== restaurant.cuisineType &&
                michelinDetails.cuisine.toLowerCase() !== 'cuisine' &&
                michelinDetails.cuisine.length > 2) {
              updateData.cuisineType = michelinDetails.cuisine;
              changes.push(`cuisine: "${restaurant.cuisineType}" → "${michelinDetails.cuisine}"`);
              console.log(`🔧 DEBUG: Will update cuisine to "${michelinDetails.cuisine}"`);
            }

            console.log(`🔧 DEBUG: Update data:`, updateData);
            console.log(`🔧 DEBUG: Changes:`, changes);

            if (Object.keys(updateData).length > 0) {
              console.log(`🔧 DEBUG: Executing database update for restaurant ID: ${restaurant.id}`);

              const updateResult = await prisma.restaurant.update({
                where: { id: restaurant.id },
                data: updateData
              });

              console.log(`🔧 DEBUG: Database update result:`, updateResult);
              console.log(`✅ Updated ${restaurant.name}: ${changes.join(', ')}`);
              updateSummary.push({
                name: restaurant.name,
                changes: changes,
                url: michelinDetails.url
              });
              updatedCount++;
            } else {
              console.log(`⏭️  No updates needed for ${restaurant.name} (no changes to make)`);
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