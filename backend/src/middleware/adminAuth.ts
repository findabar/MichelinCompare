import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { prisma } from '../utils/prisma';

// Admin authentication middleware - verifies user is authenticated AND has admin role
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
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

    if (!decoded.userId) {
      return next(createError('Invalid token', 401));
    }

    // Fetch user from database to check admin status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, admin: true },
    });

    if (!user) {
      return next(createError('User not found', 401));
    }

    if (!user.admin) {
      return next(createError('Access denied. Admin privileges required.', 403));
    }

    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid or expired token', 401));
    } else {
      next(error);
    }
  }
};

export default adminAuth;