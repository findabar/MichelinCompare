import express from 'express';
import { prisma } from '../utils/prisma';
import { visitSchema } from '../utils/validation';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = visitSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { restaurantId, dateVisited, notes } = value;
    const userId = req.userId!;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return next(createError('Restaurant not found', 404));
    }

    const existingVisit = await prisma.userVisit.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (existingVisit) {
      return next(createError('You have already visited this restaurant', 409));
    }

    const visit = await prisma.userVisit.create({
      data: {
        userId,
        restaurantId,
        dateVisited: new Date(dateVisited),
        notes,
      },
      include: {
        restaurant: true,
      },
    });

    await prisma.user.update({
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

    res.status(201).json({
      message: 'Visit recorded successfully',
      visit,
      pointsEarned: restaurant.michelinStars,
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

router.delete('/:id', async (req: AuthRequest, res, next) => {
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

    await prisma.userVisit.delete({
      where: { id },
    });

    await prisma.user.update({
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

    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;