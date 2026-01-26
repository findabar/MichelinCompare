import express from 'express';
import { prisma } from '../utils/prisma';
import { visitSchema } from '../utils/validation';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { writeLimiter } from '../middleware/rateLimiters';

const router = express.Router();

router.use(authenticateToken);

// Apply moderate rate limiting to write operations (100 req/15min)
router.post('/', writeLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = visitSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { restaurantId, dateVisited, notes, bestDish, occasion, moodRating } = value;
    const userId = req.userId!;

    // Use a transaction to atomically check, create, and update scores
    // This prevents race conditions where concurrent requests could both award first-visit points
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
      });

      if (!restaurant) {
        throw createError('Restaurant not found', 404);
      }

      // Check if user has already visited this restaurant
      const existingVisit = await tx.userVisit.findFirst({
        where: {
          userId,
          restaurantId,
        },
        orderBy: {
          dateVisited: 'asc',
        },
      });

      const isFirstVisit = !existingVisit;

      // Create the visit
      const visit = await tx.userVisit.create({
        data: {
          userId,
          restaurantId,
          dateVisited: new Date(dateVisited),
          notes,
          bestDish,
          occasion,
          moodRating,
        },
        include: {
          restaurant: true,
        },
      });

      // Award points only for the first visit to this restaurant
      if (isFirstVisit) {
        await tx.user.update({
          where: { id: userId },
          data: {
            totalScore: {
              increment: restaurant.michelinStars,
            },
            restaurantsVisitedCount: {
              increment: 1,
            },
          },
        });
      }

      return { visit, restaurant, isFirstVisit };
    });

    res.status(201).json({
      message: 'Visit recorded successfully',
      visit: result.visit,
      pointsEarned: result.isFirstVisit ? result.restaurant.michelinStars : 0,
      isFirstVisit: result.isFirstVisit,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [visits, total] = await Promise.all([
      prisma.userVisit.findMany({
        where: { userId },
        include: {
          restaurant: true,
        },
        orderBy: {
          dateVisited: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.userVisit.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      visits,
      pagination: {
        current: page,
        total: totalPages,
        count: visits.length,
        totalCount: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', writeLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const visit = await prisma.userVisit.findUnique({
      where: { id },
      include: { restaurant: true },
    });

    if (!visit) {
      return next(createError('Visit not found', 404));
    }

    if (visit.userId !== userId) {
      return next(createError('Not authorized to delete this visit', 403));
    }

    // Use a transaction to atomically check, delete, and update scores
    // This prevents race conditions where concurrent deletes could miscompute the last-visit status
    await prisma.$transaction(async (tx) => {
      // Check if there are other visits to this restaurant
      const otherVisits = await tx.userVisit.findMany({
        where: {
          userId,
          restaurantId: visit.restaurantId,
          id: { not: id },
        },
      });

      const isLastVisit = otherVisits.length === 0;

      await tx.userVisit.delete({
        where: { id },
      });

      // Only deduct points if this was the last visit to this restaurant
      if (isLastVisit) {
        await tx.user.update({
          where: { id: userId },
          data: {
            totalScore: {
              decrement: visit.restaurant.michelinStars,
            },
            restaurantsVisitedCount: {
              decrement: 1,
            },
          },
        });
      }
    });

    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;