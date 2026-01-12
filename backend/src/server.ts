import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import userRoutes from './routes/users';
import visitRoutes from './routes/visits';
import leaderboardRoutes from './routes/leaderboard';
import scraperRoutes from './routes/scraper';
import feedbackRoutes from './routes/feedback';
import adminRoutes from './routes/admin';
import wishlistRoutes from './routes/wishlist';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway proxy specifically
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://pagead2.googlesyndication.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(limiter);

// Parse FRONTEND_URL - can be comma-separated list of origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

console.log('CORS Configuration:');
console.log('- FRONTEND_URL env var:', process.env.FRONTEND_URL);
console.log('- Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS allowed origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins are:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/debug/env', (_req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL
  });
});

// Serve static files from frontend build
const frontendDistPath = path.join(process.cwd(), '../frontend/dist');
app.use(express.static(frontendDistPath));

// Handle React Router - send all non-API requests to index.html
app.use('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    next();
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});