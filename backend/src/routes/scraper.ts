import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createError } from '../middleware/errorHandler';
import adminAuth from '../middleware/adminAuth';

const router = express.Router();

// In-memory store for scraper status (in production, use Redis or database)
let scraperStatus = {
  isRunning: false,
  lastRun: null as Date | null,
  lastResult: null as any,
  currentProgress: '',
  error: null as string | null
};

// POST /api/scraper/start - Start the scraping process (requires authentication)
router.post('/start', adminAuth, async (req, res, next) => {
  try {
    if (scraperStatus.isRunning) {
      return next(createError('Scraper is already running', 409));
    }

    // Reset status
    scraperStatus = {
      isRunning: true,
      lastRun: new Date(),
      lastResult: null,
      currentProgress: 'Starting scraper...',
      error: null
    };

    // Start the scraper as a background process
    const scriptsPath = path.join(process.cwd(), 'scripts');
    const scraperPath = path.join(scriptsPath, 'scrape-michelin.js');

    // Check if scraper exists
    if (!fs.existsSync(scraperPath)) {
      scraperStatus.isRunning = false;
      scraperStatus.error = 'Scraper script not found';
      return next(createError('Scraper script not found', 500));
    }

    console.log('🚀 Starting Michelin restaurant scraper via API...');

    // Run the scraper
    const scraperProcess = spawn('node', [scraperPath], {
      cwd: scriptsPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle scraper output
    scraperProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[SCRAPER]', output);
      scraperStatus.currentProgress = output.trim();
    });

    scraperProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('[SCRAPER ERROR]', error);
      scraperStatus.error = error.trim();
    });

    scraperProcess.on('close', async (code) => {
      console.log(`🏁 Scraper process exited with code ${code}`);

      if (code === 0) {
        // Scraper succeeded, now run the seeder
        console.log('💾 Starting database seeding...');
        scraperStatus.currentProgress = 'Scraping completed, starting database seeding...';

        try {
          await runSeeder();
          scraperStatus.isRunning = false;
          scraperStatus.currentProgress = 'Completed successfully!';
          scraperStatus.lastResult = {
            success: true,
            timestamp: new Date(),
            message: 'Scraping and seeding completed successfully'
          };
        } catch (seedError) {
          console.error('❌ Seeding failed:', seedError);
          scraperStatus.isRunning = false;
          scraperStatus.error = `Seeding failed: ${seedError.message}`;
          scraperStatus.lastResult = {
            success: false,
            timestamp: new Date(),
            error: seedError.message
          };
        }
      } else {
        scraperStatus.isRunning = false;
        scraperStatus.error = `Scraper failed with exit code ${code}`;
        scraperStatus.lastResult = {
          success: false,
          timestamp: new Date(),
          error: `Process exited with code ${code}`
        };
      }
    });

    scraperProcess.on('error', (error) => {
      console.error('❌ Failed to start scraper:', error);
      scraperStatus.isRunning = false;
      scraperStatus.error = `Failed to start: ${error.message}`;
      scraperStatus.lastResult = {
        success: false,
        timestamp: new Date(),
        error: error.message
      };
    });

    res.status(202).json({
      message: 'Scraper started successfully',
      status: 'running',
      startedAt: scraperStatus.lastRun
    });

  } catch (error) {
    scraperStatus.isRunning = false;
    scraperStatus.error = error.message;
    next(error);
  }
});

// GET /api/scraper/status - Get current scraper status
router.get('/status', (req, res) => {
  res.json({
    isRunning: scraperStatus.isRunning,
    lastRun: scraperStatus.lastRun,
    currentProgress: scraperStatus.currentProgress,
    lastResult: scraperStatus.lastResult,
    error: scraperStatus.error
  });
});

// POST /api/scraper/stop - Stop the scraping process (requires authentication)
router.post('/stop', adminAuth, (_req, res, next) => {
  if (!scraperStatus.isRunning) {
    return next(createError('No scraper is currently running', 400));
  }

  // In a real implementation, you'd need to track the process ID to kill it
  // For now, just reset the status
  scraperStatus.isRunning = false;
  scraperStatus.currentProgress = 'Stopped by user';

  res.json({
    message: 'Scraper stop requested',
    status: 'stopped'
  });
});

// Helper function to run the seeder
async function runSeeder() {
  return new Promise((resolve, reject) => {
    const scriptsPath = path.join(process.cwd(), 'scripts');
    const seederPath = path.join(scriptsPath, 'seed-production.js');

    const seederProcess = spawn('node', [seederPath], {
      cwd: scriptsPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    seederProcess.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[SEEDER]', text);
      output += text;
      scraperStatus.currentProgress = `Seeding: ${text.trim()}`;
    });

    seederProcess.stderr.on('data', (data) => {
      const text = data.toString();
      console.error('[SEEDER ERROR]', text);
      errorOutput += text;
    });

    seederProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Seeding completed successfully');
        resolve(output);
      } else {
        reject(new Error(`Seeder failed with exit code ${code}: ${errorOutput}`));
      }
    });

    seederProcess.on('error', (error) => {
      reject(error);
    });
  });
}

export default router;