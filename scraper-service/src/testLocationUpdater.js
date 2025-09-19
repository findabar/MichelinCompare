const { LocationUpdater } = require('./locationUpdater');

class TestLocationUpdater extends LocationUpdater {

  async testSingleRestaurant(restaurantName) {
    console.log(`🧪 Testing location update for: "${restaurantName}"`);
    console.log('='.repeat(80));

    try {
      await this.init();

      const result = await this.searchRestaurantOnMichelin(restaurantName);

      console.log('\n📊 Final Result:');
      console.log('='.repeat(40));
      if (result) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('❌ No results found');
      }

      return result;

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  // Override to add more detailed page inspection
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

      console.log(`🔍 Testing URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take a screenshot for debugging
      const screenshotPath = `/tmp/michelin-test-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved to: ${screenshotPath}`);

      // Get page info
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyLength: document.body.innerText.length,
          bodyPreview: document.body.innerText.substring(0, 1000)
        };
      });

      console.log(`📄 Page Info:`, pageInfo);

      // Test all possible selectors extensively
      const selectorAnalysis = await page.evaluate(() => {
        const testSelectors = [
          '.card__menu',
          '.js-restaurant__list_item',
          '.selection-card',
          '.restaurant-card',
          '.poi-card',
          '.card',
          'div[class*="card"]',
          'div[class*="restaurant"]',
          'article',
          '[data-testid*="card"]',
          'a[href*="/restaurant/"]',
          'a[href*="/establishment/"]',
          '.search-results',
          '.results',
          '.listing',
          '.item'
        ];

        const analysis = {};

        testSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          analysis[selector] = {
            count: elements.length,
            sample: elements.length > 0 ? Array.from(elements).slice(0, 3).map(el => ({
              tag: el.tagName,
              className: el.className,
              text: el.textContent?.substring(0, 100),
              href: el.href || el.querySelector('a')?.href
            })) : []
          };
        });

        // Also get all elements with restaurant-like text
        const allElements = Array.from(document.querySelectorAll('*'));
        const restaurantElements = allElements.filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('restaurant') || text.includes('michelin') ||
                 el.querySelector('a[href*="/restaurant/"]') ||
                 el.querySelector('a[href*="/establishment/"]');
        }).slice(0, 5);

        analysis['restaurant_mentions'] = restaurantElements.map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.textContent?.substring(0, 200),
          hasRestaurantLink: !!el.querySelector('a[href*="/restaurant/"]')
        }));

        return analysis;
      });

      console.log(`🔍 Selector Analysis:`);
      Object.entries(selectorAnalysis).forEach(([selector, data]) => {
        if (data.count > 0) {
          console.log(`  ✅ ${selector}: ${data.count} elements`);
          if (data.sample) {
            data.sample.forEach((sample, i) => {
              console.log(`    ${i + 1}. ${sample.tag}.${sample.className} - "${sample.text}"`);
              if (sample.href) console.log(`       URL: ${sample.href}`);
            });
          }
        } else {
          console.log(`  ❌ ${selector}: 0 elements`);
        }
      });

      // Try the restaurant extraction with detailed debugging
      const restaurantData = await page.evaluate((searchName) => {
        console.log(`🔬 Starting detailed extraction for: ${searchName}`);

        // Try multiple approaches to find restaurant data
        const approaches = [
          {
            name: 'Card Menu Approach',
            selector: '.card__menu',
            nameSelectors: ['h3', 'h2', '.card__menu-content h3', '.title'],
            locationSelectors: ['.card__menu-footer--location', '.location', '.address'],
            cuisineSelectors: ['.card__menu-content--subtitle', '.cuisine', '.category']
          },
          {
            name: 'Restaurant Card Approach',
            selector: '.restaurant-card, .poi-card',
            nameSelectors: ['h3', 'h2', '.restaurant-name', '.poi-name'],
            locationSelectors: ['.location', '.address', '.poi-location'],
            cuisineSelectors: ['.cuisine', '.category', '.poi-category']
          },
          {
            name: 'Generic Card Approach',
            selector: '.card, div[class*="card"]',
            nameSelectors: ['h1', 'h2', 'h3', '.title', '.name'],
            locationSelectors: ['.location', '.address', '.city', '[class*="location"]'],
            cuisineSelectors: ['.cuisine', '.category', '.type', '[class*="cuisine"]']
          },
          {
            name: 'Link-based Approach',
            selector: 'a[href*="/restaurant/"], a[href*="/establishment/"]',
            nameSelectors: ['', 'h3', 'h2', '.title'], // First empty string means use the link text itself
            locationSelectors: ['.location', '.address'],
            cuisineSelectors: ['.cuisine', '.category']
          }
        ];

        const results = [];

        approaches.forEach(approach => {
          console.log(`🔬 Trying ${approach.name}...`);

          const containers = document.querySelectorAll(approach.selector);
          console.log(`   Found ${containers.length} containers with selector: ${approach.selector}`);

          containers.forEach((container, i) => {
            if (i >= 5) return; // Limit to first 5 for debugging

            console.log(`   🔍 Analyzing container ${i + 1}:`);

            // Extract name
            let name = '';
            for (const nameSelector of approach.nameSelectors) {
              if (nameSelector === '') {
                // Use container text directly (for links)
                name = container.textContent?.trim() || '';
              } else {
                const nameEl = container.querySelector(nameSelector);
                if (nameEl) {
                  name = nameEl.textContent?.trim() || '';
                }
              }
              if (name) break;
            }

            // Extract location
            let location = '';
            for (const locSelector of approach.locationSelectors) {
              const locEl = container.querySelector(locSelector);
              if (locEl) {
                location = locEl.textContent?.trim() || '';
                if (location) break;
              }
            }

            // Extract cuisine
            let cuisine = '';
            for (const cuisineSelector of approach.cuisineSelectors) {
              const cuisineEl = container.querySelector(cuisineSelector);
              if (cuisineEl) {
                cuisine = cuisineEl.textContent?.trim() || '';
                if (cuisine) break;
              }
            }

            // Get URL
            let url = '';
            const linkEl = container.querySelector ? container.querySelector('a[href*="/restaurant/"], a[href*="/establishment/"]') : null;
            if (linkEl) {
              url = linkEl.href || linkEl.getAttribute('href') || '';
            } else if (container.tagName === 'A') {
              url = container.href || container.getAttribute('href') || '';
            }

            console.log(`     Name: "${name}"`);
            console.log(`     Location: "${location}"`);
            console.log(`     Cuisine: "${cuisine}"`);
            console.log(`     URL: "${url}"`);
            console.log(`     Full text: "${container.textContent?.substring(0, 200)}"`);

            if (name) {
              results.push({
                approach: approach.name,
                name,
                location,
                cuisine,
                url,
                fullText: container.textContent?.substring(0, 200)
              });
            }
          });
        });

        console.log(`🔬 Total results found: ${results.length}`);
        return results;

      }, restaurantName);

      console.log(`\n🔬 Detailed Extraction Results:`);
      console.log('='.repeat(50));

      if (restaurantData && restaurantData.length > 0) {
        restaurantData.forEach((result, i) => {
          console.log(`\n${i + 1}. ${result.approach}:`);
          console.log(`   Name: "${result.name}"`);
          console.log(`   Location: "${result.location}"`);
          console.log(`   Cuisine: "${result.cuisine}"`);
          console.log(`   URL: "${result.url}"`);
          console.log(`   Sample text: "${result.fullText}"`);
        });

        // Process the results using our location parser
        const processedResults = restaurantData.map(result => {
          const parsedLocation = this.parseLocation(result.location);
          return {
            name: result.name,
            city: parsedLocation.city,
            country: parsedLocation.country,
            cuisine: result.cuisine || 'Contemporary',
            rawLocation: result.location,
            url: result.url,
            approach: result.approach
          };
        });

        return {
          restaurants: processedResults,
          totalFound: processedResults.length,
          debug: {
            pageInfo,
            selectorAnalysis,
            extractionDetails: restaurantData
          }
        };
      } else {
        console.log(`❌ No restaurant data extracted`);
        return {
          restaurants: [],
          totalFound: 0,
          debug: {
            pageInfo,
            selectorAnalysis,
            extractionDetails: []
          }
        };
      }

    } catch (error) {
      console.error(`❌ Error testing restaurant search:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }
}

// CLI interface for testing
if (require.main === module) {
  const restaurantName = process.argv[2] || 'Le Bernardin';

  console.log(`🧪 Starting single restaurant test for: "${restaurantName}"`);
  console.log(`💡 Usage: node testLocationUpdater.js "Restaurant Name"`);
  console.log('='.repeat(80));

  const tester = new TestLocationUpdater();

  tester.testSingleRestaurant(restaurantName)
    .then(result => {
      console.log('\n✅ Test completed successfully!');
      if (result && result.restaurants.length > 0) {
        console.log(`🎉 Found ${result.restaurants.length} restaurant(s)`);
      } else {
        console.log(`😞 No restaurants found - check the debug info above`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { TestLocationUpdater };