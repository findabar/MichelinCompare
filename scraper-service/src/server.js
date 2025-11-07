const express = require('express');
const cors = require('cors');
const MichelinScraper = require('./scraper');
const { seedDatabase } = require('./seeder');
const { LocationUpdater } = require('./locationUpdater');
const { TestLocationUpdater } = require('./testLocationUpdater');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// In-memory status tracking
let scraperStatus = {
  isRunning: false,
  lastRun: null,
  progress: '',
  result: null,
  error: null
};

let locationUpdateStatus = {
  isRunning: false,
  lastRun: null,
  progress: '',
  result: null,
  error: null
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'michelin-scraper',
    timestamp: new Date().toISOString()
  });
});

// Get scraper status
app.get('/status', (req, res) => {
  res.json({
    scraper: scraperStatus,
    locationUpdate: locationUpdateStatus
  });
});

// Get location update status specifically
app.get('/location-status', (req, res) => {
  res.json(locationUpdateStatus);
});

// Start scraping process
app.post('/scrape', async (req, res) => {
  if (scraperStatus.isRunning) {
    return res.status(409).json({
      error: 'Scraper is already running',
      status: scraperStatus
    });
  }

  // Get stars parameter from request body
  const { stars } = req.body;
  let starLevels = [3, 2, 1]; // default to all

  // Validate and parse stars parameter
  if (stars !== undefined) {
    if (Array.isArray(stars)) {
      starLevels = stars.filter(s => [1, 2, 3].includes(parseInt(s))).map(s => parseInt(s));
    } else if (typeof stars === 'number' || typeof stars === 'string') {
      const star = parseInt(stars);
      if ([1, 2, 3].includes(star)) {
        starLevels = [star];
      }
    }

    if (starLevels.length === 0) {
      return res.status(400).json({
        error: 'Invalid stars parameter. Must be 1, 2, 3, or array of these values.',
        example: { stars: 1 }, // or { stars: [1, 2] } or { stars: [1, 2, 3] }
      });
    }
  }

  // Start scraping process
  scraperStatus = {
    isRunning: true,
    lastRun: new Date(),
    progress: `Starting scraper for ${starLevels.join(', ')} star restaurants...`,
    result: null,
    error: null,
    targetStars: starLevels
  };

  // Return immediately while scraping runs in background
  res.status(202).json({
    message: `Scraping started for ${starLevels.join(', ')} star restaurants`,
    status: scraperStatus
  });

  // Run scraping in background
  runScrapingProcess(starLevels);
});

// Stop scraping (placeholder)
app.post('/stop', (req, res) => {
  if (!scraperStatus.isRunning) {
    return res.status(400).json({ error: 'No scraper is currently running' });
  }

  scraperStatus.isRunning = false;
  scraperStatus.progress = 'Stopped by user';

  res.json({ message: 'Scraper stopped' });
});

// Start location update process
app.post('/update-locations', async (req, res) => {
  if (locationUpdateStatus.isRunning) {
    return res.status(409).json({
      error: 'Location update is already running',
      status: locationUpdateStatus
    });
  }

  if (scraperStatus.isRunning) {
    return res.status(409).json({
      error: 'Cannot run location update while scraper is running',
      status: { scraper: scraperStatus, locationUpdate: locationUpdateStatus }
    });
  }

  // Parse filtering options from request body
  const { filterType, restaurantName, starLevel } = req.body;

  // Validate filter parameters
  let filterOptions = { filterType: filterType || 'unknown' };
  let filterDescription = 'restaurants with unknown locations';

  try {
    switch (filterOptions.filterType) {
      case 'all':
        filterDescription = 'all restaurants';
        break;

      case 'name':
        if (!restaurantName) {
          return res.status(400).json({
            error: 'Restaurant name is required when filterType is "name"',
            example: { filterType: 'name', restaurantName: 'Le Bernardin' }
          });
        }
        filterOptions.restaurantName = restaurantName;
        filterDescription = `restaurants matching "${restaurantName}"`;
        break;

      case 'stars':
        const parsedStarLevel = parseInt(starLevel);
        if (!starLevel || ![1, 2, 3].includes(parsedStarLevel)) {
          return res.status(400).json({
            error: 'Star level (1, 2, or 3) is required when filterType is "stars"',
            example: { filterType: 'stars', starLevel: 1 }
          });
        }
        filterOptions.starLevel = parsedStarLevel;
        filterDescription = `${parsedStarLevel}-star restaurants`;
        break;

      case 'unknown':
      default:
        filterOptions.filterType = 'unknown';
        filterDescription = 'restaurants with unknown locations';
        break;
    }

    // Start location update process
    locationUpdateStatus = {
      isRunning: true,
      lastRun: new Date(),
      progress: `Starting location verification for ${filterDescription}...`,
      result: null,
      error: null,
      filterOptions
    };

    // Return immediately while location update runs in background
    res.status(202).json({
      message: `Location update started for ${filterDescription}`,
      status: locationUpdateStatus,
      filterOptions
    });

    // Run location update in background
    runLocationUpdateProcess(filterOptions);

  } catch (error) {
    return res.status(400).json({
      error: 'Invalid filter parameters: ' + error.message,
      examples: {
        unknown: { filterType: 'unknown' },
        all: { filterType: 'all' },
        name: { filterType: 'name', restaurantName: 'Le Bernardin' },
        stars: { filterType: 'stars', starLevel: 1 }
      }
    });
  }
});

// Stop location update
app.post('/stop-location-update', (req, res) => {
  if (!locationUpdateStatus.isRunning) {
    return res.status(400).json({ error: 'No location update is currently running' });
  }

  locationUpdateStatus.isRunning = false;
  locationUpdateStatus.progress = 'Stopped by user';

  res.json({ message: 'Location update stopped' });
});

// Test single restaurant location lookup
app.post('/test-restaurant', async (req, res) => {
  try {
    const { restaurantName } = req.body;

    if (!restaurantName) {
      return res.status(400).json({
        error: 'Restaurant name is required',
        example: { restaurantName: 'Le Bernardin' }
      });
    }

    console.log(`🧪 Testing restaurant lookup for: ${restaurantName}`);

    const tester = new TestLocationUpdater();
    const result = await tester.testSingleRestaurant(restaurantName);

    res.json({
      success: true,
      restaurantName,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Restaurant test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

async function runScrapingProcess(starLevels = [3, 2, 1]) {
  try {
    scraperStatus.progress = 'Initializing scraper...';

    const scraper = new MichelinScraper();

    const starText = starLevels.join(', ') + ' star';
    scraperStatus.progress = `Scraping ${starText} restaurants globally...`;

    // Call the appropriate scraper method based on starLevels
    let scrapeResult;
    if (starLevels.length === 1) {
      switch (starLevels[0]) {
        case 3:
          scrapeResult = await scraper.scrape3Star();
          break;
        case 2:
          scrapeResult = await scraper.scrape2Star();
          break;
        case 1:
          scrapeResult = await scraper.scrape1Star();
          break;
        default:
          scrapeResult = await scraper.scrapeByStars(starLevels);
      }
    } else {
      scrapeResult = await scraper.scrapeByStars(starLevels);
    }

    scraperStatus.progress = 'Scraping completed, starting database seeding...';
    const seedResult = await seedDatabase();

    scraperStatus.isRunning = false;
    scraperStatus.progress = `Completed successfully! Scraped ${starText} restaurants.`;
    scraperStatus.result = {
      scrape: scrapeResult,
      seed: seedResult,
      timestamp: new Date(),
      targetStars: starLevels
    };

    console.log(`✅ Scraping and seeding completed successfully for ${starText} restaurants`);

  } catch (error) {
    console.error('❌ Scraping process failed:', error);

    scraperStatus.isRunning = false;
    scraperStatus.error = error.message;
    scraperStatus.progress = 'Failed: ' + error.message;
    scraperStatus.result = {
      success: false,
      error: error.message,
      timestamp: new Date(),
      targetStars: starLevels
    };
  }
}

async function runLocationUpdateProcess(filterOptions = {}) {
  try {
    locationUpdateStatus.progress = 'Initializing location updater...';

    const updater = new LocationUpdater();

    const filterDescription = locationUpdateStatus.filterOptions ?
      locationUpdateStatus.progress.replace('Starting location verification for ', '').replace('...', '') :
      'restaurants';

    locationUpdateStatus.progress = `Checking ${filterDescription} on Michelin Guide for location and cuisine updates...`;

    const updateResult = await updater.checkRestaurantDetails(filterOptions);

    locationUpdateStatus.isRunning = false;
    locationUpdateStatus.progress = 'Completed successfully!';
    locationUpdateStatus.result = {
      ...updateResult,
      filterOptions,
      timestamp: new Date()
    };

    console.log(`✅ Location update completed successfully for ${filterDescription}`);

  } catch (error) {
    console.error('❌ Location update process failed:', error);

    locationUpdateStatus.isRunning = false;
    locationUpdateStatus.error = error.message;
    locationUpdateStatus.progress = 'Failed: ' + error.message;
    locationUpdateStatus.result = {
      success: false,
      error: error.message,
      filterOptions,
      timestamp: new Date()
    };
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Michelin Scraper Service running on port ${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /status              - Check scraper and location update status`);
  console.log(`   GET  /location-status     - Check location update status`);
  console.log(`   POST /scrape              - Start scraping process`);
  console.log(`   POST /stop                - Stop scraping process`);
  console.log(`   POST /update-locations    - Start location update process (with filtering)`);
  console.log(`   POST /stop-location-update - Stop location update process`);
  console.log(`   POST /test-restaurant     - Test single restaurant lookup`);
  console.log(``);
  console.log(`🔍 Location Update Filtering Options:`);
  console.log(`   Default (unknown):  { "filterType": "unknown" }`);
  console.log(`   All restaurants:    { "filterType": "all" }`);
  console.log(`   By name:           { "filterType": "name", "restaurantName": "Le Bernardin" }`);
  console.log(`   By stars:          { "filterType": "stars", "starLevel": 1 }`);
});