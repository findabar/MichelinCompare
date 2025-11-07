import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { createError } from '../middleware/errorHandler';
import adminAuth from '../middleware/adminAuth';

const router = express.Router();

// Scraper service URL - this should be set via environment variable
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002';

// Helper function for making HTTP requests
function makeRequest(url: string, options: { method?: string; data?: any } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.data && { 'Content-Length': Buffer.byteLength(JSON.stringify(options.data)) })
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error || res.statusMessage}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

// POST /api/scraper/start - Start the scraping process (requires authentication)
router.post('/start', adminAuth, async (req, res, next) => {
  try {
    const { stars } = req.body;

    console.log(`🚀 Triggering scraper service${stars ? ` for ${Array.isArray(stars) ? stars.join(', ') : stars} star restaurants` : ''}...`);

    // Prepare request data
    const requestData: any = {};
    if (stars !== undefined) {
      requestData.stars = stars;
    }

    // Call the scraper service
    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      data: requestData
    });

    res.status(202).json({
      message: `Scraper started successfully via scraper service${stars ? ` for ${Array.isArray(stars) ? stars.join(', ') : stars} star restaurants` : ''}`,
      scraperService: SCRAPER_SERVICE_URL,
      targetStars: stars,
      result
    });

  } catch (error) {
    console.error('❌ Failed to start scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to start scraper: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/status - Get current scraper status
router.get('/status', async (_req, res, next) => {
  try {
    console.log('📊 Fetching scraper status from service...');

    const status = await makeRequest(`${SCRAPER_SERVICE_URL}/status`);

    res.json({
      ...status,
      scraperService: SCRAPER_SERVICE_URL
    });

  } catch (error) {
    console.error('❌ Failed to get scraper status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return res.json({
        isRunning: false,
        error: 'Scraper service unavailable',
        scraperService: SCRAPER_SERVICE_URL,
        lastRun: null,
        progress: 'Service unavailable',
        result: null
      });
    }

    next(createError(`Failed to get scraper status: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/stop - Stop the scraping process (requires authentication)
router.post('/stop', adminAuth, async (_req, res, next) => {
  try {
    console.log('🛑 Stopping scraper service...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/stop`, {
      method: 'POST'
    });

    res.json({
      message: 'Scraper stop requested via scraper service',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to stop scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable', 503));
    }

    next(createError(`Failed to stop scraper: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/update-locations - Start location update process (requires authentication)
router.post('/update-locations', adminAuth, async (_req, res, next) => {
  try {
    console.log('🗺️  Triggering location update process...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/update-locations`, {
      method: 'POST'
    });

    res.status(202).json({
      message: 'Location update process started successfully',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to start location update process:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to start location update: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/location-status - Get location update status
router.get('/location-status', async (_req, res, next) => {
  try {
    console.log('📊 Fetching location update status from service...');

    const status = await makeRequest(`${SCRAPER_SERVICE_URL}/location-status`);

    res.json({
      ...status,
      scraperService: SCRAPER_SERVICE_URL
    });

  } catch (error) {
    console.error('❌ Failed to get location update status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return res.json({
        isRunning: false,
        error: 'Scraper service unavailable',
        scraperService: SCRAPER_SERVICE_URL,
        lastRun: null,
        progress: 'Service unavailable',
        result: null
      });
    }

    next(createError(`Failed to get location update status: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/stop-location-update - Stop location update process (requires authentication)
router.post('/stop-location-update', adminAuth, async (_req, res, next) => {
  try {
    console.log('🛑 Stopping location update process...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/stop-location-update`, {
      method: 'POST'
    });

    res.json({
      message: 'Location update stop requested',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to stop location update process:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable', 503));
    }

    next(createError(`Failed to stop location update: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/test-restaurant - Test single restaurant lookup (requires authentication)
router.post('/test-restaurant', adminAuth, async (req, res, next) => {
  try {
    const { restaurantName } = req.body;

    if (!restaurantName) {
      return res.status(400).json({
        error: 'Restaurant name is required in request body',
        example: { restaurantName: 'Le Bernardin' }
      });
    }

    console.log(`🧪 Testing restaurant lookup via backend for: ${restaurantName}`);

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/test-restaurant`, {
      method: 'POST',
      data: { restaurantName }
    });

    res.json({
      message: `Restaurant test completed for: ${restaurantName}`,
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to test restaurant lookup:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to test restaurant lookup: ${errorMessage}`, 500));
  }
});


export default router;