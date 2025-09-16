import express from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        totalScore: true,
        restaurantsVisitedCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(createError('User not found', 404));
    }

    const visitStats = await prisma.userVisit.groupBy({
      by: ['restaurantId'],
      where: { userId },
      _count: true,
    });

    const starStats = await prisma.$queryRaw`
      SELECT
        r.michelin_stars as stars,
        COUNT(*)::int as count
      FROM user_visits uv
      JOIN restaurants r ON uv.restaurant_id = r.id
      WHERE uv.user_id = ${userId}
      GROUP BY r.michelin_stars
      ORDER BY r.michelin_stars
    ` as unknown as Array<{ stars: number; count: number }>;

    const countryStats = await prisma.$queryRaw`
      SELECT
        r.country,
        COUNT(*)::int as count
      FROM user_visits uv
      JOIN restaurants r ON uv.restaurant_id = r.id
      WHERE uv.user_id = ${userId}
      GROUP BY r.country
      ORDER BY count DESC
      LIMIT 10
    ` as unknown as Array<{ country: string; count: number }>;

    res.json({
      user,
      stats: {
        byStars: starStats,
        byCountry: countryStats,
        totalVisits: visitStats.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile/:username', async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        totalScore: true,
        restaurantsVisitedCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(createError('User not found', 404));
    }

    const recentVisits = await prisma.userVisit.findMany({
      where: { userId: user.id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            michelinStars: true,
          },
        },
      },
      orderBy: {
        dateVisited: 'desc',
      },
      take: 10,
    });

    const starStats = await prisma.$queryRaw`
      SELECT
        r.michelin_stars as stars,
        COUNT(*)::int as count
      FROM user_visits uv
      JOIN restaurants r ON uv.restaurant_id = r.id
      WHERE uv.user_id = ${user.id}
      GROUP BY r.michelin_stars
      ORDER BY r.michelin_stars
    ` as unknown as Array<{ stars: number; count: number }>;

    res.json({
      user,
      recentVisits,
      stats: {
        byStars: starStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;