import express from 'express';
import { createError } from '../middleware/errorHandler';
import adminAuth from '../middleware/adminAuth';

const router = express.Router();

// Scraper service URL - this should be set via environment variable
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002';

// POST /api/scraper/start - Start the scraping process (requires authentication)
router.post('/start', adminAuth, async (req, res, next) => {
  try {
    console.log('🚀 Triggering scraper service...');

    // Call the scraper service
    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Scraper service error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    res.status(202).json({
      message: 'Scraper started successfully via scraper service',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to start scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('fetch')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to start scraper: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/status - Get current scraper status
router.get('/status', async (_req, res, next) => {
  try {
    console.log('📊 Fetching scraper status from service...');

    const response = await fetch(`${SCRAPER_SERVICE_URL}/status`);

    if (!response.ok) {
      throw new Error(`Scraper service error: ${response.statusText}`);
    }

    const status = await response.json();

    res.json({
      ...status,
      scraperService: SCRAPER_SERVICE_URL
    });

  } catch (error) {
    console.error('❌ Failed to get scraper status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('fetch')) {
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

    const response = await fetch(`${SCRAPER_SERVICE_URL}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Scraper service error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    res.json({
      message: 'Scraper stop requested via scraper service',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to stop scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('fetch')) {
      return next(createError('Scraper service unavailable', 503));
    }

    next(createError(`Failed to stop scraper: ${errorMessage}`, 500));
  }
});


export default router;