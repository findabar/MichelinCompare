import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../utils/validation';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { username, email, password } = value;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return next(createError('User with this email or username already exists', 409));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Explicitly set only the validated fields to prevent field injection (e.g., admin: true)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        admin: false, // Explicitly set to false to prevent injection
      },
    });

    const token = generateToken({ userId: user.id });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        admin: user.admin,
        totalScore: user.totalScore,
        restaurantsVisitedCount: user.restaurantsVisitedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { email, password } = value;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(createError('Invalid email or password', 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(createError('Invalid email or password', 401));
    }

    const token = generateToken({ userId: user.id });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        admin: user.admin,
        totalScore: user.totalScore,
        restaurantsVisitedCount: user.restaurantsVisitedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        admin: true,
        totalScore: true,
        restaurantsVisitedCount: true,
      },
    });

    if (!user) {
      return next(createError('User not found', 404));
    }

    // Generate new token
    const token = generateToken({ userId: user.id });

    res.json({
      message: 'Token refreshed successfully',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;