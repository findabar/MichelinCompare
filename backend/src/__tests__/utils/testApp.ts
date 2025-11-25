import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from '../../routes/auth';
import restaurantRoutes from '../../routes/restaurants';
import userRoutes from '../../routes/users';
import visitRoutes from '../../routes/visits';
import leaderboardRoutes from '../../routes/leaderboard';
import feedbackRoutes from '../../routes/feedback';
import scraperRoutes from '../../routes/scraper';
import { errorHandler } from '../../middleware/errorHandler';

/**
 * Create Express app for testing without starting the server
 */
export function createTestApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/visits', visitRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/scraper', scraperRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  return app;
}
