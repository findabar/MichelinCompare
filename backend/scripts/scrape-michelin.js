const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

class MichelinScraper {
  constructor() {
    this.restaurants = [];
    this.browser = null;
  }

  async init() {
    // Use system Chrome on Railway (available at these paths)
    const executablePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];

    let executablePath = null;
    for (const path of executablePaths) {
      if (require('fs').existsSync(path)) {
        executablePath = path;
        break;
      }
    }

    if (!executablePath) {
      throw new Error('No Chrome/Chromium executable found on system');
    }

    console.log(`🌐 Using Chrome at: ${executablePath}`);

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async scrapeCountry(countryCode, countryName) {
    console.log(`🌟 Scraping Michelin restaurants for ${countryName}...`);

    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
      // Start with the main country page
      const url = `https://guide.michelin.com/${countryCode}/en/restaurants`;
      console.log(`📍 Visiting: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Look for star filter buttons
      const starLevels = [3, 2, 1];

      for (const stars of starLevels) {
        console.log(`⭐ Scraping ${stars}-star restaurants...`);
        await this.scrapeStarLevel(page, countryCode, countryName, stars);
      }

    } catch (error) {
      console.error(`❌ Error scraping ${countryName}:`, error.message);
    } finally {
      await page.close();
    }
  }

  async scrapeStarLevel(page, countryCode, countryName, starLevel) {
    try {
      // Navigate to filtered page for specific star level
      const filterUrl = `https://guide.michelin.com/${countryCode}/en/restaurants?sort=none&page=1&search=*&distinctions=michelin-${starLevel}-star`;
      await page.goto(filterUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      await page.waitForTimeout(2000);

      // Get total pages
      let totalPages = 1;
      try {
        const paginationInfo = await page.$('.pagination-summary');
        if (paginationInfo) {
          const text = await paginationInfo.textContent();
          const match = text.match(/of (\d+)/);
          if (match) {
            totalPages = parseInt(match[1]);
          }
        }
      } catch (e) {
        console.log('Could not determine pagination, assuming 1 page');
      }

      console.log(`📄 Found ${totalPages} pages for ${starLevel}-star restaurants`);

      // Scrape each page
      for (let pageNum = 1; pageNum <= Math.min(totalPages, 10); pageNum++) {
        console.log(`📖 Scraping page ${pageNum}/${totalPages}...`);

        if (pageNum > 1) {
          const pageUrl = `https://guide.michelin.com/${countryCode}/en/restaurants?sort=none&page=${pageNum}&search=*&distinctions=michelin-${starLevel}-star`;
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          await page.waitForTimeout(2000);
        }

        await this.scrapeRestaurantsFromPage(page, countryName, starLevel);
      }

    } catch (error) {
      console.error(`❌ Error scraping ${starLevel}-star restaurants:`, error.message);
    }
  }

  async scrapeRestaurantsFromPage(page, countryName, starLevel) {
    try {
      // Wait for restaurant cards to load
      await page.waitForSelector('.card__menu', { timeout: 10000 });

      const restaurants = await page.evaluate((country, stars) => {
        const cards = document.querySelectorAll('.card__menu');
        const results = [];

        cards.forEach(card => {
          try {
            const nameEl = card.querySelector('.card__menu-content h3, .card__menu-content .card__menu-content--title');
            const cityEl = card.querySelector('.card__menu-footer--location');
            const cuisineEl = card.querySelector('.card__menu-content .card__menu-content--subtitle');
            const linkEl = card.querySelector('a[href*="/restaurant"]');

            if (nameEl && cityEl) {
              const name = nameEl.textContent?.trim();
              const location = cityEl.textContent?.trim();
              const cuisine = cuisineEl?.textContent?.trim() || 'Contemporary';
              const href = linkEl?.getAttribute('href');

              // Extract city from location (format: "City, Region" or just "City")
              const city = location.split(',')[0]?.trim();

              if (name && city) {
                results.push({
                  name,
                  city,
                  country,
                  cuisineType: cuisine,
                  michelinStars: stars,
                  yearAwarded: new Date().getFullYear(), // Default to current year
                  address: location,
                  latitude: null,
                  longitude: null,
                  description: `${stars}-star Michelin restaurant in ${city}`,
                  imageUrl: null,
                  url: href ? `https://guide.michelin.com${href}` : null
                });
              }
            }
          } catch (e) {
            console.log('Error parsing restaurant card:', e);
          }
        });

        return results;
      }, countryName, starLevel);

      console.log(`🍽️  Found ${restaurants.length} restaurants on this page`);
      this.restaurants.push(...restaurants);

    } catch (error) {
      console.error('❌ Error scraping restaurants from page:', error.message);
    }
  }

  async scrapeAll() {
    await this.init();

    try {
      // Scrape UK
      await this.scrapeCountry('gb', 'United Kingdom');

      // Scrape US
      await this.scrapeCountry('us', 'United States');

      console.log(`🎉 Scraping completed! Found ${this.restaurants.length} restaurants total`);

      // Save to file
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, 'michelin-restaurants.json');
      fs.writeFileSync(filePath, JSON.stringify(this.restaurants, null, 2));

      console.log(`💾 Data saved to: ${filePath}`);
      console.log(`📊 Total restaurants: ${this.restaurants.length}`);
      console.log(`🇺🇸 US restaurants: ${this.restaurants.filter(r => r.country === 'United States').length}`);
      console.log(`🇬🇧 UK restaurants: ${this.restaurants.filter(r => r.country === 'United Kingdom').length}`);

    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new MichelinScraper();
  scraper.scrapeAll()
    .then(() => {
      console.log('✅ Scraping finished successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = MichelinScraper;