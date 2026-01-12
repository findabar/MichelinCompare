import express from 'express';
import { prisma } from '../utils/prisma';
import { restaurantQuerySchema } from '../utils/validation';
import { createError } from '../middleware/errorHandler';
import adminAuth from '../middleware/adminAuth';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { error, value } = restaurantQuerySchema.validate(req.query);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { page, limit, search, country, city, cuisineType, michelinStars } = value;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { cuisineType: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (cuisineType) {
      where.cuisineType = { contains: cuisineType, mode: 'insensitive' };
    }

    if (michelinStars != null) {
      where.michelinStars = michelinStars;
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { michelinStars: 'desc' },
          { name: 'asc' },
        ],
      }),
      prisma.restaurant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      restaurants,
      pagination: {
        current: page,
        total: totalPages,
        count: restaurants.length,
        totalCount: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/filters', async (req, res, next) => {
  try {
    const [countries, cities, cuisineTypes] = await Promise.all([
      prisma.restaurant.findMany({
        select: { country: true },
        distinct: ['country'],
        orderBy: { country: 'asc' },
      }),
      prisma.restaurant.findMany({
        select: { city: true, country: true },
        distinct: ['city', 'country'],
        orderBy: [{ country: 'asc' }, { city: 'asc' }],
      }),
      prisma.restaurant.findMany({
        select: { cuisineType: true },
        distinct: ['cuisineType'],
        orderBy: { cuisineType: 'asc' },
      }),
    ]);

    res.json({
      countries: countries.map((c: any) => c.country),
      cities: cities.map((c: any) => ({ city: c.city, country: c.country })),
      cuisineTypes: cuisineTypes.map((c: any) => c.cuisineType),
    });
  } catch (error) {
    next(error);
  }
});

// Map endpoint - returns restaurants with location data and user flags
router.get('/map', async (req: AuthRequest, res, next) => {
  try {
    // Parse query parameters
    const {
      bounds,
      stars,
      cuisines,
      priceMin,
      priceMax,
      centerLat,
      centerLng,
      radiusKm,
    } = req.query;

    // Build where clause
    const where: any = {
      // Only include restaurants with coordinates
      latitude: { not: null },
      longitude: { not: null },
    };

    // Filter by bounds (for viewport-based queries)
    if (bounds && typeof bounds === 'string') {
      try {
        const { north, south, east, west } = JSON.parse(bounds);
        where.latitude = {
          gte: south,
          lte: north,
        };
        where.longitude = {
          gte: west,
          lte: east,
        };
      } catch (e) {
        return next(createError('Invalid bounds format', 400));
      }
    }

    // Filter by star level (can be comma-separated: "1,2,3")
    if (stars && typeof stars === 'string') {
      const starLevels = stars.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (starLevels.length > 0) {
        where.michelinStars = { in: starLevels };
      }
    }

    // Filter by cuisines (comma-separated)
    if (cuisines && typeof cuisines === 'string') {
      const cuisineList = cuisines.split(',').map(c => c.trim());
      if (cuisineList.length > 0) {
        where.OR = cuisineList.map(cuisine => ({
          cuisineType: { contains: cuisine, mode: 'insensitive' }
        }));
      }
    }

    // Fetch restaurants
    const restaurants = await prisma.restaurant.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        cuisineType: true,
        michelinStars: true,
        distinction: true,
        latitude: true,
        longitude: true,
        address: true,
        imageUrl: true,
      },
      // Limit results for performance (can be adjusted)
      take: 1000,
    });

    // If user is authenticated, add visit and wishlist flags
    let enrichedRestaurants = restaurants;
    if (req.userId) {
      const userId = req.userId;

      // Get user's visits and wishlists
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

      const visitedIds = new Set(userVisits.map(v => v.restaurantId));
      const wishlistIds = new Set(userWishlists.map(w => w.restaurantId));

      enrichedRestaurants = restaurants.map(r => ({
        ...r,
        isVisited: visitedIds.has(r.id),
        isWishlisted: wishlistIds.has(r.id),
      }));
    }

    res.json({
      restaurants: enrichedRestaurants,
      count: enrichedRestaurants.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        visits: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            dateVisited: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!restaurant) {
      return next(createError('Restaurant not found', 404));
    }

    // Get count of unique users who have visited (social indicator)
    // Note: For beta, we're just showing the count, not the names
    const uniqueVisitorsCount = await prisma.userVisit.groupBy({
      by: ['userId'],
      where: {
        restaurantId: id,
      },
      _count: {
        userId: true,
      },
    });

    const socialIndicator = {
      friendsVisitedCount: uniqueVisitorsCount.length,
    };

    res.json({
      ...restaurant,
      socialIndicator,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, cuisineType, michelinStars, description } = req.body;

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!existingRestaurant) {
      return next(createError('Restaurant not found', 404));
    }

    // Update restaurant
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name: name || existingRestaurant.name,
        address: address || existingRestaurant.address,
        city: city || existingRestaurant.city,
        country: country || existingRestaurant.country,
        cuisineType: cuisineType || existingRestaurant.cuisineType,
        michelinStars: michelinStars !== undefined ? michelinStars : existingRestaurant.michelinStars,
        description: description !== undefined ? description : existingRestaurant.description,
      },
      include: {
        visits: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            dateVisited: 'desc',
          },
          take: 10,
        },
      },
    });

    res.json({
      success: true,
      message: `Restaurant "${updatedRestaurant.name}" updated successfully`,
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        visits: true,
      },
    });

    if (!restaurant) {
      return next(createError('Restaurant not found', 404));
    }

    // Delete all visits associated with this restaurant first
    if (restaurant.visits.length > 0) {
      await prisma.userVisit.deleteMany({
        where: { restaurantId: id },
      });
    }

    // Then delete the restaurant
    await prisma.restaurant.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Restaurant "${restaurant.name}" and ${restaurant.visits.length} associated visits deleted successfully`,
      deletedVisits: restaurant.visits.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;