import express from 'express';
import { prisma } from '../utils/prisma';
import { travelPlanSchema } from '../utils/validation';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { generateTravelPlan } from '../services/routeOptimizationService';
import crypto from 'crypto';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's travel plans
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [travelPlans, total] = await Promise.all([
      prisma.travelPlan.findMany({
        where: { userId },
        include: {
          restaurants: {
            include: {
              restaurant: true,
            },
            orderBy: [{ day: 'asc' }, { order: 'asc' }],
          },
        },
        orderBy: {
          startDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.travelPlan.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      travelPlans,
      pagination: {
        current: page,
        total: totalPages,
        count: travelPlans.length,
        totalCount: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create a new travel plan
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = travelPlanSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { city, country, startDate, endDate, maxStarsPerDay, preferredCuisines, includeVisited } =
      value;
    const userId = req.userId!;

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get restaurants in the city
    const whereClause: any = {
      city: { contains: city, mode: 'insensitive' },
      latitude: { not: null },
      longitude: { not: null },
    };

    if (country) {
      whereClause.country = { contains: country, mode: 'insensitive' };
    }

    if (preferredCuisines && preferredCuisines.length > 0) {
      whereClause.OR = preferredCuisines.map((cuisine: string) => ({
        cuisineType: { contains: cuisine, mode: 'insensitive' },
      }));
    }

    const restaurants = await prisma.restaurant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        michelinStars: true,
        cuisineType: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });

    if (restaurants.length === 0) {
      return next(createError('No restaurants found in the specified city', 404));
    }

    // Get user's visits and wishlist
    const [userVisits, userWishlists] = await Promise.all([
      prisma.userVisit.findMany({
        where: { userId },
        select: { restaurantId: true },
      }),
      prisma.wishlist.findMany({
        where: { userId },
        select: { restaurantId: true },
      }),
    ]);

    const visitedIds = new Set(userVisits.map((v) => v.restaurantId));
    const wishlistIds = new Set(userWishlists.map((w) => w.restaurantId));

    // Filter out visited restaurants unless includeVisited is true
    let filteredRestaurants = restaurants.map((r) => ({
      ...r,
      isWishlisted: wishlistIds.has(r.id),
      isVisited: visitedIds.has(r.id),
    }));

    if (!includeVisited) {
      filteredRestaurants = filteredRestaurants.filter((r) => !r.isVisited);
    }

    if (filteredRestaurants.length === 0) {
      return next(
        createError('No unvisited restaurants found in the specified city. Try enabling "Include Visited".', 404)
      );
    }

    // Generate optimized travel plan
    const dayPlans = generateTravelPlan(filteredRestaurants, days, maxStarsPerDay);

    // Create travel plan in database
    const shareToken = crypto.randomBytes(16).toString('hex');

    const travelPlan = await prisma.travelPlan.create({
      data: {
        userId,
        city,
        country,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxStarsPerDay,
        preferredCuisines,
        includeVisited,
        shareToken,
        restaurants: {
          create: dayPlans.flatMap((dayPlan) =>
            dayPlan.meals.map((meal) => ({
              restaurantId: meal.restaurant.id,
              day: dayPlan.day,
              mealType: meal.mealType,
              order: meal.order,
            }))
          ),
        },
      },
      include: {
        restaurants: {
          include: {
            restaurant: true,
          },
          orderBy: [{ day: 'asc' }, { order: 'asc' }],
        },
      },
    });

    res.status(201).json({
      message: 'Travel plan created successfully',
      travelPlan,
      shareUrl: `${process.env.FRONTEND_URL}/travel-plans/${shareToken}`,
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific travel plan by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const travelPlan = await prisma.travelPlan.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        restaurants: {
          include: {
            restaurant: true,
          },
          orderBy: [{ day: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!travelPlan) {
      return next(createError('Travel plan not found', 404));
    }

    res.json({ travelPlan });
  } catch (error) {
    next(error);
  }
});

// Get a travel plan by share token (public)
router.get('/share/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const travelPlan = await prisma.travelPlan.findUnique({
      where: { shareToken: token },
      include: {
        restaurants: {
          include: {
            restaurant: true,
          },
          orderBy: [{ day: 'asc' }, { order: 'asc' }],
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!travelPlan) {
      return next(createError('Travel plan not found', 404));
    }

    res.json({ travelPlan });
  } catch (error) {
    next(error);
  }
});

// Delete a travel plan
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const travelPlan = await prisma.travelPlan.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!travelPlan) {
      return next(createError('Travel plan not found', 404));
    }

    await prisma.travelPlan.delete({
      where: { id },
    });

    res.json({ message: 'Travel plan deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
