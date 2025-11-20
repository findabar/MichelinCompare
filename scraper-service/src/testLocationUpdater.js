const { LocationUpdater } = require('./locationUpdater');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Make sure to set this environment variable
});

class TestLocationUpdater extends LocationUpdater {
  constructor() {
    super();
    // Enable debug logging only if DEBUG env var is set
    this.DEBUG = process.env.DEBUG === 'true';
  }

  log(...args) {
    if (this.DEBUG) {
      console.log(...args);
    }
  }

  async extractRestaurantDetailsWithAI(pageContent, restaurantName) {
    try {
      this.log(`🤖 Using OpenAI to extract restaurant details...`);

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
        model: "gpt-4o-mini",
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

      let aiResponse = response.choices[0].message.content.trim();
      this.log(`🤖 OpenAI Response:`, aiResponse);

      // Remove markdown code block markers if present
      if (aiResponse.startsWith('```')) {
        aiResponse = aiResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      // Parse the JSON response
      const restaurantData = JSON.parse(aiResponse);

      return restaurantData;

    } catch (error) {
      console.error(`❌ OpenAI extraction failed:`, error);
      return { restaurants: [] };
    }
  }

  async extractRestaurantDetailsFromPage(url) {
    try {
      this.log(`🔍 Extracting details from: ${url}`);

      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract dLayer data from the page
      const dLayerData = await page.evaluate(() => {
        // Look for dLayer in the page content
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const content = script.textContent || '';
          if (content.includes('dLayer')) {
            // Extract dLayer values using regex
            const extractValue = (key) => {
              const regex = new RegExp(`dLayer\\['${key}'\\]\\s*=\\s*'([^']*)'`);
              const match = content.match(regex);
              return match ? match[1] : null;
            };

            return {
              distinction: extractValue('distinction'),
              city: extractValue('city'),
              region: extractValue('region'),
              restaurant_selection: extractValue('restaurant_selection'),
              restaurant_name: extractValue('restaurant_name'),
              cookingtype: extractValue('cookingtype'),
            };
          }
        }
        return null;
      });

      await page.close();

      if (dLayerData) {
        this.log(`📊 dLayer data:`, dLayerData);

        // Parse star rating from distinction field (e.g., "2 star" -> 2)
        let stars = null;
        if (dLayerData.distinction) {
          const match = dLayerData.distinction.match(/(\d+)\s*star/i);
          if (match) {
            stars = parseInt(match[1]);
          }
        }

        console.log(`✅ Extracted from dLayer: ${dLayerData.restaurant_name} - ${stars} stars, ${dLayerData.city}, ${dLayerData.restaurant_selection}`);

        return {
          name: dLayerData.restaurant_name,
          city: dLayerData.city,
          country: dLayerData.restaurant_selection,
          michelinStars: stars,
          url: url
        };
      }

      return null;

    } catch (error) {
      console.error(`❌ Failed to extract details from ${url}:`, error.message);
      return null;
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

      console.log(`🔍 Searching for: ${restaurantName}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take a screenshot for debugging
      const screenshotPath = `/tmp/michelin-test-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.log(`📸 Screenshot saved to: ${screenshotPath}`);

      // Get page info
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyLength: document.body.innerText.length,
          bodyPreview: document.body.innerText.substring(0, 1000)
        };
      });

      this.log(`📄 Page Info:`, pageInfo);

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

      this.log(`🔍 Selector Analysis:`);
      Object.entries(selectorAnalysis).forEach(([selector, data]) => {
        if (data.count > 0) {
          this.log(`  ✅ ${selector}: ${data.count} elements`);
          if (data.sample) {
            data.sample.forEach((sample, i) => {
              this.log(`    ${i + 1}. ${sample.tag}.${sample.className} - "${sample.text}"`);
              if (sample.href) this.log(`       URL: ${sample.href}`);
            });
          }
        } else {
          this.log(`  ❌ ${selector}: 0 elements`);
        }
      });

      // Try the restaurant extraction with detailed debugging
      const restaurantData = await page.evaluate(() => {

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
          const containers = document.querySelectorAll(approach.selector);

          containers.forEach((container, i) => {
            if (i >= 5) return; // Limit to first 5 for debugging

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
        return results;

      });

      this.log(`\n🔬 Detailed Extraction Results:`);
      this.log('='.repeat(50));

      if (restaurantData && restaurantData.length > 0) {
        restaurantData.forEach((result, i) => {
          this.log(`\n${i + 1}. ${result.approach}:`);
          this.log(`   Name: "${result.name}"`);
          this.log(`   Location: "${result.location}"`);
          this.log(`   Cuisine: "${result.cuisine}"`);
          this.log(`   URL: "${result.url}"`);
          this.log(`   Sample text: "${result.fullText}"`);
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

        // Try to get details from restaurant detail page using dLayer data
        this.log(`\n🔍 Attempting to extract dLayer data from restaurant pages...`);
        let enrichedResults = [...processedResults];

        // Find the first result with a valid URL that matches the search query
        const firstMatch = processedResults.find(r =>
          r.url && r.name.toLowerCase().includes(restaurantName.toLowerCase())
        ) || processedResults.find(r => r.url);

        if (firstMatch && firstMatch.url) {
          try {
            const dLayerDetails = await this.extractRestaurantDetailsFromPage(firstMatch.url);

            if (dLayerDetails && dLayerDetails.michelinStars !== null) {
              this.log(`✅ Successfully extracted dLayer data with ${dLayerDetails.michelinStars} stars`);

              // Update the matching result with dLayer data
              enrichedResults = enrichedResults.map(r => {
                if (r.url === firstMatch.url) {
                  return {
                    ...r,
                    city: dLayerDetails.city || r.city,
                    country: dLayerDetails.country || r.country,
                    michelinStars: dLayerDetails.michelinStars,
                    approach: 'dLayer Extraction'
                  };
                }
                return r;
              });

              // Return early with enriched data
              return {
                restaurants: enrichedResults,
                totalFound: enrichedResults.length,
                debug: {
                  pageInfo,
                  selectorAnalysis,
                  extractionDetails: restaurantData,
                  dLayerExtraction: dLayerDetails
                }
              };
            }
          } catch (dLayerError) {
            console.error(`❌ dLayer extraction failed:`, dLayerError.message);
            // Continue to AI fallback
          }
        }

        // If dLayer extraction didn't work and no stars were extracted, try using AI
        const hasStars = enrichedResults.some(r => r.michelinStars !== null);
        if (!hasStars) {
          this.log(`⚠️ No stars detected in extraction, trying AI method...`);

          try {
            const pageContent = await page.content();
            const aiData = await this.extractRestaurantDetailsWithAI(pageContent, restaurantName);

            if (aiData?.restaurants?.length > 0) {
              this.log(`🤖 AI extracted ${aiData.restaurants.length} restaurants with star data`);

              // Merge AI data with enriched results, preferring AI data for missing fields
              const merged = enrichedResults.map((result, index) => {
                const aiMatch = aiData.restaurants.find(ai =>
                  ai.name.toLowerCase() === result.name.toLowerCase()
                ) || aiData.restaurants[index];

                if (aiMatch) {
                  return {
                    ...result,
                    city: result.city || aiMatch.city,
                    country: result.country !== 'Unknown Country' ? result.country : aiMatch.country,
                    cuisine: result.cuisine || aiMatch.cuisine,
                    michelinStars: aiMatch.michelinStars || result.michelinStars
                  };
                }
                return result;
              });

              return {
                restaurants: merged,
                totalFound: merged.length,
                debug: {
                  pageInfo,
                  selectorAnalysis,
                  extractionDetails: restaurantData,
                  aiExtraction: aiData
                }
              };
            }
          } catch (aiError) {
            console.error(`❌ AI extraction failed:`, aiError.message);
            // Continue with original results even if AI fails
          }
        }

        return {
          restaurants: enrichedResults,
          totalFound: enrichedResults.length,
          debug: {
            pageInfo,
            selectorAnalysis,
            extractionDetails: restaurantData
          }
        };
      } else {
        this.log(`❌ No restaurant data extracted, trying AI method...`);

        try {
          const pageContent = await page.content();
          const aiData = await this.extractRestaurantDetailsWithAI(pageContent, restaurantName);

          if (aiData?.restaurants?.length > 0) {
            const processedAI = aiData.restaurants.map(r => ({
              name: r.name,
              city: r.city,
              country: r.country,
              cuisine: r.cuisine || 'Contemporary',
              michelinStars: r.michelinStars,
              rawLocation: `${r.city}, ${r.country}`,
              url: r.url,
              approach: 'AI Extraction'
            }));

            return {
              restaurants: processedAI,
              totalFound: processedAI.length,
              debug: {
                pageInfo,
                selectorAnalysis,
                extractionDetails: [],
                aiExtraction: aiData
              }
            };
          }
        } catch (aiError) {
          console.error(`❌ AI extraction failed:`, aiError.message);
        }

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