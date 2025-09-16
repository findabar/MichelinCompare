import express from 'express';
import { prisma } from '../utils/prisma';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalScore: true,
          restaurantsVisitedCount: true,
          createdAt: true,
        },
        orderBy: [
          { totalScore: 'desc' },
          { restaurantsVisitedCount: 'desc' },
          { createdAt: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    const usersWithRank = users.map((user: any, index: number) => ({
      ...user,
      rank: skip + index + 1,
    }));

    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersWithRank,
      pagination: {
        current: page,
        total: totalPages,
        count: users.length,
        totalCount: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalVisits,
      totalRestaurants,
      topCountries,
      starDistribution,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userVisit.count(),
      prisma.restaurant.count(),
      prisma.$queryRaw`
        SELECT
          r.country,
          COUNT(DISTINCT uv.user_id)::int as unique_visitors,
          COUNT(*)::int as total_visits
        FROM user_visits uv
        JOIN restaurants r ON uv.restaurant_id = r.id
        GROUP BY r.country
        ORDER BY unique_visitors DESC, total_visits DESC
        LIMIT 10
      ` as unknown as Array<{ country: string; unique_visitors: number; total_visits: number }>,
      prisma.$queryRaw`
        SELECT
          r.michelin_stars as stars,
          COUNT(*)::int as visit_count,
          COUNT(DISTINCT uv.user_id)::int as unique_visitors
        FROM user_visits uv
        JOIN restaurants r ON uv.restaurant_id = r.id
        GROUP BY r.michelin_stars
        ORDER BY r.michelin_stars
      ` as unknown as Array<{ stars: number; visit_count: number; unique_visitors: number }>,
    ]);

    res.json({
      totalUsers,
      totalVisits,
      totalRestaurants,
      topCountries,
      starDistribution,
    });
  } catch (error) {
    next(error);
  }
});

export default router;