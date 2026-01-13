import express from 'express';
import { config } from './config';
import logger from './utils/logger';
import alertsRouter from './routes/alerts';
import healthRouter from './routes/health';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/alerts', alertsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Issue Intelligence Service',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`Issue Intelligence Service started`, {
    port: PORT,
    nodeEnv: config.server.nodeEnv,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
