const { LocationUpdater } = require('./locationUpdater');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Make sure to set this environment variable
});

class TestLocationUpdater extends LocationUpdater {

  async extractRestaurantDetailsWithAI(pageContent, restaurantName) {
    try {
      console.log(`🤖 Using OpenAI to extract restaurant details...`);

      const prompt = `You are analyzing a Michelin Guide restaurant search results page. Please extract restaurant information from the following HTML content.

Search Query: "${restaurantName}"

HTML Content:
${pageContent}

Please extract all restaurants that match or are similar to "${restaurantName}" and provide the information in the following JSON format:

{
  "restaurants": [
    {
      "name": "exact restaurant name",
      "city": "city name",
      "country": "country name",
      "cuisine": "cuisine type (e.g., French, Italian, Contemporary, etc.)",
      "michelinStars": "number of stars (1, 2, or 3)",
      "url": "full URL to restaurant page"
    }
  ]
}

Rules:
1. Only include restaurants that are clearly related to the search "${restaurantName}"
2. Extract the city and country from the page content or URL structure
3. If cuisine type is not explicitly mentioned, make a reasonable inference based on the restaurant name/context
4. If Michelin stars are not clear, default to 1
5. Ensure all URLs are complete (start with https://)
6. If information is unclear, use your best judgment based on the context

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
        max_tokens: 2000
      });

      const aiResponse = response.choices[0].message.content.trim();
      console.log(`🤖 OpenAI Response:`, aiResponse);

      // Parse the JSON response
      const restaurantData = JSON.parse(aiResponse);

      return restaurantData;

    } catch (error) {
      console.error(`❌ OpenAI extraction failed:`, error);
      return { restaurants: [] };
    }
  }

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
            cuisineSelectors: ['.card__menu-content--subtitle', '.cuisine', '.category'],
            starSelectors: ['.distinction', '[class*="star"]', 'svg', '.card__menu-content--distinction']
          },
          {
            name: 'Restaurant Card Approach',
            selector: '.restaurant-card, .poi-card',
            nameSelectors: ['h3', 'h2', '.restaurant-name', '.poi-name'],
            locationSelectors: ['.location', '.address', '.poi-location'],
            cuisineSelectors: ['.cuisine', '.category', '.poi-category'],
            starSelectors: ['.distinction', '[class*="star"]', 'svg']
          },
          {
            name: 'Generic Card Approach',
            selector: '.card, div[class*="card"]',
            nameSelectors: ['h1', 'h2', 'h3', '.title', '.name'],
            locationSelectors: ['.location', '.address', '.city', '[class*="location"]'],
            cuisineSelectors: ['.cuisine', '.category', '.type', '[class*="cuisine"]'],
            starSelectors: ['.distinction', '[class*="star"]', 'svg', '[class*="distinction"]']
          },
          {
            name: 'Link-based Approach',
            selector: 'a[href*="/restaurant/"], a[href*="/establishment/"]',
            nameSelectors: ['', 'h3', 'h2', '.title'], // First empty string means use the link text itself
            locationSelectors: ['.location', '.address'],
            cuisineSelectors: ['.cuisine', '.category'],
            starSelectors: ['.distinction', '[class*="star"]', 'svg']
          }
        ];

        // Helper function to extract star count from element
        const extractStarCount = (container) => {
          // Method 1: Count star SVG icons
          const starSvgs = container.querySelectorAll('svg[class*="star"], .icon-star, [class*="michelin-star"]');
          if (starSvgs.length > 0 && starSvgs.length <= 3) {
            return starSvgs.length;
          }

          // Method 2: Look for text patterns
          const fullText = container.textContent || '';

          // Check for "Three Stars", "Two Stars", "One Star" patterns
          if (/three\s*(?:michelin\s*)?stars?/i.test(fullText)) return 3;
          if (/two\s*(?:michelin\s*)?stars?/i.test(fullText)) return 2;
          if (/one\s*(?:michelin\s*)?star/i.test(fullText)) return 1;

          // Check for "3 Stars", "2 Stars", "1 Star" patterns
          if (/3\s*(?:michelin\s*)?stars?/i.test(fullText)) return 3;
          if (/2\s*(?:michelin\s*)?stars?/i.test(fullText)) return 2;
          if (/1\s*(?:michelin\s*)?star/i.test(fullText)) return 1;

          // Method 3: Check distinction class names
          const distinctionEl = container.querySelector('[class*="distinction"]');
          if (distinctionEl) {
            const classes = distinctionEl.className || '';
            if (classes.includes('3') || classes.includes('three')) return 3;
            if (classes.includes('2') || classes.includes('two')) return 2;
            if (classes.includes('1') || classes.includes('one')) return 1;
          }

          // Method 4: Count Michelin star characters (m symbol)
          const mStars = (fullText.match(/\u2B50|\u2606|\u2605|⭐|★|☆/g) || []).length;
          if (mStars > 0 && mStars <= 3) return mStars;

          return null;
        };

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

            // Extract star count
            const stars = extractStarCount(container);

            console.log(`     Name: "${name}"`);
            console.log(`     Location: "${location}"`);
            console.log(`     Cuisine: "${cuisine}"`);
            console.log(`     Stars: ${stars}`);
            console.log(`     URL: "${url}"`);
            console.log(`     Full text: "${container.textContent?.substring(0, 200)}"`);

            if (name) {
              results.push({
                approach: approach.name,
                name,
                location,
                cuisine,
                stars,
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
            michelinStars: result.stars,
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