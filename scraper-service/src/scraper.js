const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MichelinScraper {
  constructor() {
    this.restaurants = [];
    this.restaurantKeys = new Set(); // Track unique restaurants by name + city
    this.browser = null;
  }

  async init() {
    console.log('🚀 Initializing browser...');

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

  // Helper method to create a unique key for a restaurant
  createRestaurantKey(name, city, country) {
    return `${name.toLowerCase().trim()}|${city.toLowerCase().trim()}|${country.toLowerCase().trim()}`;
  }

  // Helper method to check if restaurant already exists
  isRestaurantDuplicate(name, city, country) {
    const key = this.createRestaurantKey(name, city, country);
    return this.restaurantKeys.has(key);
  }

  // Helper method to add restaurant if not duplicate
  addRestaurantIfNew(restaurant) {
    const key = this.createRestaurantKey(restaurant.name, restaurant.city, restaurant.country);

    if (!this.restaurantKeys.has(key)) {
      this.restaurants.push(restaurant);
      this.restaurantKeys.add(key);
      return true; // Added
    }
    return false; // Duplicate, not added
  }

  async scrapeStarLevel(starLevel) {
    console.log(`🌟 Scraping ${starLevel}-star Michelin restaurants globally...`);

    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      // Use direct URLs for each star level to get global results
      const starUrls = {
        3: 'https://guide.michelin.com/en/restaurants/3-stars-michelin',
        2: 'https://guide.michelin.com/en/restaurants/2-stars-michelin',
        1: 'https://guide.michelin.com/en/restaurants/1-star-michelin'
      };

      const url = starUrls[starLevel];
      console.log(`📍 Visiting: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get total pages for pagination
      let totalPages = await this.detectPagination(page, starLevel);

      console.log(`📄 Found ${totalPages} total pages for ${starLevel}-star restaurants`);

      if (totalPages > 100) {
        // Very high page count might indicate infinite scroll or incorrect detection
        console.log(`🔄 Detected high page count (${totalPages} pages), using scroll-based scraping`);
        await this.scrapeWithInfiniteScroll(page, starLevel);
      } else {
        // Traditional pagination
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`📖 Scraping page ${pageNum}/${totalPages} for ${starLevel}-star restaurants...`);

          if (pageNum > 1) {
            const pageUrl = `${url}/page/${pageNum}`;
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          await this.scrapeRestaurantsFromPage(page, starLevel);
        }
      }

    } catch (error) {
      console.error(`❌ Error scraping ${starLevel}-star restaurants:`, error.message);
    } finally {
      await page.close();
    }
  }

  async detectPagination(page, starLevel) {
    try {
      console.log(`🔍 Detecting pagination for ${starLevel}-star restaurants...`);

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try multiple approaches to find pagination

      // Approach 1: Look for pagination navigation elements
      const paginationSelectors = [
        '.pagination',
        '.pager',
        '.page-navigation',
        '[class*="pagination"]',
        '[class*="pager"]',
        '.pagination-summary',
        '.pagination-info'
      ];

      // Also try to find pagination by looking for numbered links
      console.log('🔍 Looking for numbered pagination links...');
      const numberedLinks = await page.evaluate(() => {
        // Look for links that contain just numbers
        const links = Array.from(document.querySelectorAll('a[href*="/page/"]'));
        const pageNumbers = links.map(link => {
          const href = link.getAttribute('href');
          const match = href.match(/\/page\/(\d+)/);
          return match ? parseInt(match[1]) : null;
        }).filter(num => num !== null);

        return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;
      });

      if (numberedLinks > 0) {
        console.log(`📄 Found numbered pagination links up to page: ${numberedLinks}`);
        return numberedLinks;
      }

      for (const selector of paginationSelectors) {
        try {
          const paginationEl = await page.$(selector);
          if (paginationEl) {
            console.log(`📄 Found pagination element: ${selector}`);

            // Get all text from pagination element
            const paginationText = await page.evaluate(el => el.textContent, paginationEl);
            console.log(`📄 Pagination text: ${paginationText}`);

            // Try to extract page numbers
            const pageNumbers = await page.evaluate((sel) => {
              const pagination = document.querySelector(sel);
              if (!pagination) return [];

              const numbers = Array.from(pagination.querySelectorAll('a, button, span'))
                .map(el => el.textContent?.trim())
                .filter(text => /^\d+$/.test(text))
                .map(Number)
                .filter(num => !isNaN(num));

              return numbers;
            }, selector);

            if (pageNumbers.length > 0) {
              const maxPage = Math.max(...pageNumbers);
              console.log(`📄 Found page numbers: ${pageNumbers.join(', ')}, max: ${maxPage}`);
              if (maxPage > 1) return maxPage;
            }

            // Try regex patterns on the text
            const patterns = [
              /page\s+\d+\s+of\s+(\d+)/i,
              /(\d+)\s+pages/i,
              /of\s+(\d+)/i,
              /total\s+(\d+)/i
            ];

            for (const pattern of patterns) {
              const match = paginationText.match(pattern);
              if (match) {
                const totalPages = parseInt(match[1]);
                console.log(`📄 Found ${totalPages} pages using pattern: ${pattern}`);
                if (totalPages > 1) return totalPages;
              }
            }
          }
        } catch (e) {
          console.log(`❌ Error with selector ${selector}:`, e.message);
        }
      }

      // Approach 2: Scroll to bottom and check for load more / infinite scroll
      console.log(`🔄 Checking for infinite scroll or load more...`);
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for content to load

      const newHeight = await page.evaluate(() => document.body.scrollHeight);

      if (newHeight > initialHeight) {
        console.log(`🔄 Detected content loading on scroll (${initialHeight} → ${newHeight})`);
        // This suggests infinite scroll - we need to handle this differently
        // For now, return a high number to trigger more aggressive scraping
        return 200;
      }

      // Approach 3: Check for "Load More" buttons
      const loadMoreSelectors = [
        'button[class*="load"]',
        'button[class*="more"]',
        '.load-more',
        '.show-more',
        '[data-testid*="load"]'
      ];

      for (const selector of loadMoreSelectors) {
        const loadMore = await page.$(selector);
        if (loadMore) {
          console.log(`🔄 Found load-more button: ${selector}`);
          return 100; // Assume many pages for load-more pattern
        }
      }

      console.log('❌ Could not determine pagination method, assuming single page');
      return 1;
    } catch (error) {
      console.log('❌ Error detecting pagination:', error.message);
      return 1;
    }
  }

  async scrapeWithInfiniteScroll(page, starLevel) {
    console.log(`🔄 Starting infinite scroll scraping for ${starLevel}-star restaurants...`);

    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let scrollAttempts = 0;
    let maxScrollAttempts = 500; // Prevent infinite loops
    let noNewContentCount = 0;

    while (scrollAttempts < maxScrollAttempts && noNewContentCount < 3) {
      // Scrape current content
      await this.scrapeRestaurantsFromPage(page, starLevel);

      // Scroll down
      console.log(`🔄 Scrolling... attempt ${scrollAttempts + 1}`);
      previousHeight = currentHeight;

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if new content loaded
      currentHeight = await page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        noNewContentCount++;
        console.log(`⚠️  No new content loaded (attempt ${noNewContentCount}/3)`);

        // Try to find and click load more button
        const loadMoreButton = await page.$('button[class*="load"], button[class*="more"], .load-more, .show-more');
        if (loadMoreButton) {
          console.log(`🔄 Found load more button, clicking...`);
          await loadMoreButton.click();
          await new Promise(resolve => setTimeout(resolve, 5000));
          currentHeight = await page.evaluate(() => document.body.scrollHeight);
          if (currentHeight > previousHeight) {
            noNewContentCount = 0; // Reset counter if new content loaded
          }
        }
      } else {
        noNewContentCount = 0; // Reset counter
        console.log(`✅ New content loaded (height: ${previousHeight} → ${currentHeight})`);
      }

      scrollAttempts++;
    }

    // Final scrape of any remaining content
    await this.scrapeRestaurantsFromPage(page, starLevel);

    console.log(`🔄 Infinite scroll completed after ${scrollAttempts} attempts`);
  }

  /**
   * Scrape detailed information from an individual restaurant page
   */
  async scrapeRestaurantDetails(url) {
    const page = await this.browser.newPage();

    try {
      console.log(`🔍 Fetching details for: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const details = await page.evaluate((pageUrl) => {
        console.log(`[DEBUG] Scraping details from: ${pageUrl}`);

        // Country name translation map (for non-English dataLayer values)
        const countryTranslations = {
          'España': 'Spain',
          'France': 'France',
          'Italia': 'Italy',
          'Deutschland': 'Germany',
          'Schweiz': 'Switzerland',
          'Suisse': 'Switzerland',
          'Österreich': 'Austria',
          'Nederland': 'Netherlands',
          'België': 'Belgium',
          'Belgique': 'Belgium',
          'Portugal': 'Portugal',
          'United Kingdom': 'United Kingdom',
          'Ireland': 'Ireland',
          'Danmark': 'Denmark',
          'Sverige': 'Sweden',
          'Norge': 'Norway',
          'Suomi': 'Finland',
          'Polska': 'Poland',
          'Česko': 'Czech Republic',
          'Magyarország': 'Hungary',
          'Ελλάδα': 'Greece',
          'Türkiye': 'Turkey',
          '日本': 'Japan',
          'Hong Kong SAR': 'Hong Kong',
          'Singapore': 'Singapore',
          'Thailand': 'Thailand',
          'South Korea': 'South Korea',
          'United States': 'USA',
          'Canada': 'Canada',
          'México': 'Mexico',
          'Brasil': 'Brazil',
          'Argentina': 'Argentina',
          'Chile': 'Chile',
          'Peru': 'Peru',
          'Colombia': 'Colombia',
          'Australia': 'Australia',
          'New Zealand': 'New Zealand',
          'South Africa': 'South Africa',
          'United Arab Emirates': 'UAE',
          'China': 'China',
          '中国': 'China'
        };

        // Get city and country from dataLayer
        let city = null;
        let country = null;

        try {
          console.log(`[DEBUG] Checking dataLayer...`);
          if (window.dataLayer && Array.isArray(window.dataLayer)) {
            console.log(`[DEBUG] dataLayer exists with ${window.dataLayer.length} entries`);
            for (let i = 0; i < window.dataLayer.length; i++) {
              const layer = window.dataLayer[i];
              console.log(`[DEBUG] Layer ${i}:`, {
                hasCity: !!layer.city,
                hasCountry: !!layer.country,
                city: layer.city,
                country: layer.country
              });
              if (layer.city) city = layer.city;
              if (layer.country) {
                country = countryTranslations[layer.country] || layer.country;
              }
              if (city && country) break;
            }
            console.log(`[DEBUG] Final dataLayer extraction: city=${city}, country=${country}`);
          } else {
            console.log(`[DEBUG] dataLayer not found or not an array`);
          }
        } catch (e) {
          console.error('[DEBUG] Error reading dataLayer:', e);
        }

        // Try multiple selectors for description
        const descriptionSelectors = [
          '.restaurant-details__description',
          '.poi-description',
          '[data-restaurant-description]',
          '.description',
          '.about',
          '.js-restaurant__description',
          '.restaurant__description-content',
          'div[class*="description"]',
          'section[class*="about"]'
        ];

        let description = null;
        for (const selector of descriptionSelectors) {
          const descEl = document.querySelector(selector);
          if (descEl && descEl.textContent?.trim()) {
            description = descEl.textContent.trim();
            break;
          }
        }

        // Get cuisine from data-sheet__block--text
        let cuisine = null;
        try {
          const dataSheetBlocks = document.querySelectorAll('.js-restaurant__info .data-sheet__block.data-sheet__block--text');

          for (const block of dataSheetBlocks) {
            const text = block.textContent?.trim() || '';
            // Skip if it's just price symbols (££££)
            if (text && !/^[£$€¥₩]+$/.test(text)) {
              // Extract cuisine after price symbols
              const match = text.match(/[£$€¥₩]+\s*[·•]\s*(.+)/);
              if (match) {
                cuisine = match[1].trim();
              } else if (!text.includes('•') && !text.includes('·')) {
                // If no separator, might be just the cuisine
                cuisine = text;
              }
              if (cuisine) break;
            }
          }
        } catch (e) {
          console.error('Error extracting cuisine:', e);
        }

        return {
          description,
          city,
          country,
          cuisine
        };
      }, url);

      await page.close();
      return details;
    } catch (error) {
      console.error(`❌ Error fetching details from ${url}:`, error.message);
      await page.close();
      return null;
    }
  }

  async scrapeRestaurantsFromPage(page, starLevel) {
    try {
      // Try different selectors for restaurant cards based on Michelin Guide structure
      const possibleSelectors = [
        '.card__menu',  // Primary selector found in analysis
        '.js-restaurant__list_item', // Also found in analysis
        '.selection-card', // Alternative class found
        '[data-restaurant]',
        '.restaurant-card',
        '.poi-card',
        '.card',
        '.restaurant-item',
        '.js-restaurant-card',
        '.poi-card-link',
        'div[class*="card"][class*="restaurant"]',
        'div[class*="poi"]',
        'article[class*="card"]',
        '[data-cy="restaurant-card"]',
        '.search-results__item',
        'a[href*="/restaurant/"]' // Links to restaurant pages
      ];

      let cards = [];
      let foundSelector = null;

      for (const selector of possibleSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          cards = await page.$$(selector);
          if (cards.length > 0) {
            foundSelector = selector;
            console.log(`✅ Found ${cards.length} elements using selector: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Selector ${selector} not found or timed out`);
        }
      }

      if (cards.length === 0) {
        console.log('⚠️  No restaurant cards found with any selector. Debugging...');
        console.log('Page title:', await page.title());
        console.log('Page URL:', page.url());

        // Try to find any elements that might contain restaurants
        const debugInfo = await page.evaluate(() => {
          const body = document.body;
          const allElements = body.querySelectorAll('*');
          const classNames = new Set();
          const ids = new Set();

          // Collect all class names and IDs that might be restaurant-related
          allElements.forEach(el => {
            if (el.className && typeof el.className === 'string') {
              el.className.split(' ').forEach(cls => {
                if (cls && (cls.includes('card') || cls.includes('restaurant') || cls.includes('poi') || cls.includes('item'))) {
                  classNames.add('.' + cls);
                }
              });
            }
            if (el.id && (el.id.includes('card') || el.id.includes('restaurant') || el.id.includes('poi'))) {
              ids.add('#' + el.id);
            }
          });

          // Count elements with common patterns
          const potentialSelectors = [
            'div[class*="card"]',
            'div[class*="item"]',
            'div[class*="restaurant"]',
            'div[class*="poi"]',
            'article',
            '[data-testid*="card"]',
            '[data-testid*="item"]',
            '.js-restaurant-card',
            '.restaurant-card',
            '.poi-card-link'
          ];

          const counts = {};
          potentialSelectors.forEach(sel => {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
              counts[sel] = els.length;
            }
          });

          return {
            classNames: Array.from(classNames).slice(0, 20),
            ids: Array.from(ids).slice(0, 10),
            potentialCounts: counts,
            bodyText: document.body.innerText.substring(0, 800)
          };
        });

        console.log('🔍 Potential card class names found:', debugInfo.classNames);
        console.log('🔍 Potential card IDs found:', debugInfo.ids);
        console.log('🔍 Element counts for potential selectors:', debugInfo.potentialCounts);
        console.log('📄 Page content preview:', debugInfo.bodyText);
        return;
      }

      const restaurants = await page.evaluate((stars, selector) => {
        const cards = document.querySelectorAll(selector);
        const results = [];

        cards.forEach((card, index) => {
          try {
            // Try multiple selector patterns for restaurant name
            const nameSelectors = [
              '.card__menu-content h3',
              '.card__menu-content--title',
              'h3',
              'h2',
              '.restaurant-name',
              '.poi-name',
              '[data-restaurant-name]',
              '.title'
            ];

            // Try multiple selector patterns for location (fallback)
            const locationSelectors = [
              '.card__menu-footer--location',
              '.card__menu-footer--score',
              '.location',
              '.address',
              '.city',
              '.poi-location',
              '[data-location]',
              '.card__menu-footer',
              '.poi-address',
              '.restaurant-location'
            ];

            let nameEl = null;
            let locationText = '';
            let cuisineText = 'Contemporary';

            // Find name element
            for (const sel of nameSelectors) {
              nameEl = card.querySelector(sel);
              if (nameEl && nameEl.textContent?.trim()) break;
            }

            // Find ALL card__menu-footer--score elements (contains both location and cuisine)
            const footerScoreElements = card.querySelectorAll('.card__menu-footer--score');

            if (footerScoreElements.length > 0) {
              // First element is usually the location (e.g., "Bangkok, Thailand")
              const firstElement = footerScoreElements[0]?.textContent?.trim();
              if (firstElement) {
                locationText = firstElement;
                console.log(`[CARD ${index + 1}] Location text found: "${locationText}"`);
              }

              // Second element usually contains price + cuisine (e.g., "฿฿฿฿ · Thai Cuisine")
              if (footerScoreElements.length > 1) {
                const secondElement = footerScoreElements[1]?.textContent?.trim();
                if (secondElement) {
                  // Extract cuisine after price symbols and separator (·, •, or -)
                  const cuisineMatch = secondElement.match(/[£$€¥฿₩]+\s*[·•\-]\s*(.+)/);
                  if (cuisineMatch && cuisineMatch[1]) {
                    cuisineText = cuisineMatch[1].trim();
                  }
                }
              }
            }

            // Fallback to old selectors if card__menu-footer--score didn't work
            if (!locationText) {
              for (const sel of locationSelectors) {
                const el = card.querySelector(sel);
                if (el && el.textContent?.trim()) {
                  locationText = el.textContent.trim();
                  break;
                }
              }
            }

            const linkEl = card.querySelector('a[href*="/restaurant"], a[href*="/establishment"]');

            if (nameEl && nameEl.textContent?.trim()) {
              const name = nameEl.textContent.trim();
              const cuisine = cuisineText;
              const href = linkEl?.getAttribute('href');

              // Enhanced location parsing
              let city = 'Unknown City';
              let country = 'Unknown Country';
              let fullAddress = locationText;

              if (locationText) {
                // Clean up the location text
                let cleanLocation = locationText
                  .replace(/^\s*[-•·]\s*/, '') // Remove leading bullets/dashes
                  .replace(/\s+/g, ' ')        // Normalize whitespace
                  .trim();

                // Try different location parsing strategies
                if (cleanLocation.includes(',')) {
                  // Format: "City, Region, Country" or "City, Country"
                  const parts = cleanLocation.split(',').map(p => p.trim()).filter(p => p);

                  if (parts.length >= 2) {
                    city = parts[0];
                    country = parts[parts.length - 1];

                    // If we have 3+ parts, the middle might be region/state
                    if (parts.length >= 3) {
                      // Check if last part looks like a country (common country names)
                      const lastPart = parts[parts.length - 1].toLowerCase();
                      const countryPatterns = [
                        'france', 'italy', 'spain', 'germany', 'uk', 'united kingdom', 'usa', 'united states',
                        'japan', 'singapore', 'hong kong', 'china', 'thailand', 'india', 'australia',
                        'switzerland', 'austria', 'belgium', 'netherlands', 'portugal', 'sweden',
                        'denmark', 'norway', 'canada', 'mexico', 'brazil', 'argentina', 'chile'
                      ];

                      if (countryPatterns.some(pattern => lastPart.includes(pattern))) {
                        country = parts[parts.length - 1];
                      } else {
                        // Assume format is "City, Region" - try to infer country from region or use last part
                        country = parts[parts.length - 1];
                      }
                    }
                  }
                } else {
                  // Single location string - try to parse
                  city = cleanLocation;

                  // Try to infer country from city name or context
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
                  // Add more patterns as needed
                }

                fullAddress = cleanLocation;
              }

              console.log(`Found restaurant ${index + 1}: ${name} in ${city}, ${country} (from: "${locationText}")`);

              results.push({
                name,
                city,
                country,
                cuisineType: cuisine,
                michelinStars: stars,
                distinction: `${stars} MICHELIN Star${stars > 1 ? 's' : ''}`,
                yearAwarded: new Date().getFullYear(),
                address: fullAddress,
                latitude: null,
                longitude: null,
                description: `${stars}-star Michelin restaurant in ${city}, ${country}`,
                imageUrl: null,
                url: href ? (href.startsWith('http') ? href : `https://guide.michelin.com${href}`) : null
              });
            } else {
              console.log(`Card ${index + 1}: No name found, skipping`);
            }
          } catch (e) {
            console.log(`Error parsing restaurant card ${index}:`, e.message);
          }
        });

        return results;
      }, starLevel, foundSelector);

      console.log(`🍽️  Found ${restaurants.length} restaurants on this page`);

      // Add restaurants, checking for duplicates and fetching detailed information
      let addedCount = 0;
      let duplicateCount = 0;

      for (const restaurant of restaurants) {
        // Skip if duplicate
        if (this.isRestaurantDuplicate(restaurant.name, restaurant.city, restaurant.country)) {
          duplicateCount++;
          continue;
        }

        // Fetch detailed information if URL is available
        if (restaurant.url) {
          console.log(`📖 Fetching detailed information for: ${restaurant.name}`);
          const details = await this.scrapeRestaurantDetails(restaurant.url);

          console.log(`🔍 Details scraped for ${restaurant.name}:`, {
            city: details?.city || 'null',
            country: details?.country || 'null',
            cuisine: details?.cuisine || 'null',
            description: details?.description ? `${details.description.substring(0, 50)}...` : 'null'
          });

          if (details) {
            // Update description if found
            if (details.description) {
              restaurant.description = details.description;
            }

            // Update city from dataLayer (most accurate)
            if (details.city) {
              restaurant.city = details.city;
              console.log(`✅ Updated city from dataLayer: ${details.city}`);
            }

            // Update country from dataLayer (only if not 'en' language code)
            // Card parsing already extracted correct country from "City, Country" format
            if (details.country && details.country !== 'en') {
              restaurant.country = details.country;
              console.log(`✅ Updated country from dataLayer: ${details.country}`);
            } else if (details.country === 'en') {
              console.log(`⚠️  Skipping country update - dataLayer returned language code 'en', keeping card country: ${restaurant.country}`);
            }

            // Update cuisine from data-sheet block
            if (details.cuisine) {
              restaurant.cuisineType = details.cuisine;
              console.log(`✅ Updated cuisine from data-sheet: ${details.cuisine}`);
            }
          } else {
            console.log(`⚠️  No details returned for ${restaurant.name}, using card data: ${restaurant.city}, ${restaurant.country}, ${restaurant.cuisineType}`);
          }

          // Add a small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Add the restaurant with detailed information
        if (this.addRestaurantIfNew(restaurant)) {
          addedCount++;
        } else {
          duplicateCount++;
        }
      }

      console.log(`✅ Added ${addedCount} new restaurants with detailed info, skipped ${duplicateCount} duplicates`);

    } catch (error) {
      console.error('❌ Error scraping restaurants from page:', error.message);
    }
  }

  async scrapeAll() {
    return await this.scrapeByStars([3, 2, 1]);
  }

  async scrape3Star() {
    return await this.scrapeByStars([3]);
  }

  async scrape2Star() {
    return await this.scrapeByStars([2]);
  }

  async scrape1Star() {
    return await this.scrapeByStars([1]);
  }

  async scrapeByStars(starLevels = [3, 2, 1]) {
    await this.init();

    try {
      console.log(`🌟 Starting scrape for ${starLevels.join(', ')} star restaurants...`);

      // Scrape specified star levels
      for (const starLevel of starLevels) {
        await this.scrapeStarLevel(starLevel);
      }

      console.log(`🎉 Scraping completed! Found ${this.restaurants.length} restaurants total`);

      // Save to database (raw_data table)
      console.log('💾 Saving to database...');

      let savedCount = 0;
      let errorCount = 0;

      for (const restaurant of this.restaurants) {
        try {
          await prisma.rawData.create({
            data: {
              name: restaurant.name,
              city: restaurant.city,
              country: restaurant.country,
              cuisineType: restaurant.cuisineType || restaurant.cuisine || 'Unknown',
              michelinStars: restaurant.michelinStars,
              yearAwarded: restaurant.yearAwarded || null,
              address: restaurant.address || null,
              latitude: restaurant.latitude || null,
              longitude: restaurant.longitude || null,
              description: restaurant.description || null,
              imageUrl: restaurant.imageUrl || null,
              phone: restaurant.phone || null,
              website: restaurant.website || null,
              michelinUrl: restaurant.url || restaurant.michelinUrl || null,
              distinction: restaurant.distinction || null,
              processed: false
            }
          });
          savedCount++;
        } catch (error) {
          console.error(`❌ Error saving ${restaurant.name}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Saved ${savedCount} restaurants to database`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} restaurants failed to save`);
      }

      // Also save to file as backup
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const starSuffix = starLevels.length === 1 ? `-${starLevels[0]}star` : '';
      const filePath = path.join(dataDir, `michelin-restaurants${starSuffix}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.restaurants, null, 2));

      console.log(`💾 Backup saved to: ${filePath}`);
      console.log(`📊 Total restaurants: ${this.restaurants.length}`);

      // Count by star level
      const starBreakdown = {
        '3-star': this.restaurants.filter(r => r.michelinStars === 3).length,
        '2-star': this.restaurants.filter(r => r.michelinStars === 2).length,
        '1-star': this.restaurants.filter(r => r.michelinStars === 1).length
      };

      console.log(`⭐ 3-star restaurants: ${starBreakdown['3-star']}`);
      console.log(`⭐ 2-star restaurants: ${starBreakdown['2-star']}`);
      console.log(`⭐ 1-star restaurants: ${starBreakdown['1-star']}`);

      return {
        success: true,
        totalRestaurants: this.restaurants.length,
        filePath: filePath,
        breakdown: starBreakdown,
        scrapedStars: starLevels
      };

    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the scraper if called directly
if (require.main === module) {
  const scraper = new MichelinScraper();
  scraper.scrapeAll()
    .then((result) => {
      console.log('✅ Scraping finished successfully!', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = MichelinScraper;