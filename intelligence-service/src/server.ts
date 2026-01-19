import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { LogMonitorCron } from './cron';
import { StateManager } from './services/stateManager';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL_MINUTES || '10';

// Middleware
app.use(express.json());

// Initialize cron job
const monitor = new LogMonitorCron();
let isRunning = false;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'intelligence-service',
    timestamp: new Date().toISOString(),
    isRunning,
  });
});

// Manual trigger endpoint
app.post('/trigger-check', async (req, res) => {
  if (isRunning) {
    return res.status(429).json({
      success: false,
      error: 'Check already in progress',
    });
  }

  try {
    isRunning = true;
    res.json({
      success: true,
      message: 'Log check triggered',
      timestamp: new Date().toISOString(),
    });

    // Run check asynchronously
    await monitor.run();
  } catch (error) {
    console.error('Manual trigger failed:', error);
  } finally {
    isRunning = false;
  }
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const stateManager = new StateManager();
    const stats = await stateManager.getStats();
    await stateManager.cleanup();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const stateManager = new StateManager();
    const unanalyzed = await stateManager.getUnanalyzedIssues();
    await stateManager.cleanup();

    res.json({
      success: true,
      data: {
        isRunning,
        pollingInterval: `${POLLING_INTERVAL} minutes`,
        unanalyzedIssues: unanalyzed.length,
        unanalyzedList: unanalyzed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

// Setup cron job (every N minutes)
const cronExpression = `*/${POLLING_INTERVAL} * * * *`;
console.log(`Setting up cron job with expression: ${cronExpression}`);

cron.schedule(cronExpression, async () => {
  if (isRunning) {
    console.log('Previous check still running, skipping...');
    return;
  }

  try {
    isRunning = true;
    await monitor.run();
  } catch (error) {
    console.error('Cron job failed:', error);
  } finally {
    isRunning = false;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await monitor.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await monitor.cleanup();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Intelligence Service running on port ${PORT}`);
  console.log(`Polling interval: ${POLLING_INTERVAL} minutes`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
