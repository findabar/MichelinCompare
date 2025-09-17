import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

// Simple admin authentication middleware
// In production, you'd want more sophisticated role-based access control
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(createError('No authorization header provided', 401));
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return next(createError('No token provided', 401));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(createError('JWT_SECRET not configured', 500));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // For now, any authenticated user can run the scraper
    // In production, you'd check for admin role here
    if (!decoded.userId) {
      return next(createError('Invalid token', 401));
    }

    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    next(createError('Invalid or expired token', 401));
  }
};

export default adminAuth;