import express from 'express';
import { prisma } from '../utils/prisma';
import { restaurantQuerySchema } from '../utils/validation';
import { createError } from '../middleware/errorHandler';

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

    if (michelinStars) {
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

    res.json(restaurant);
  } catch (error) {
    next(error);
  }
});

export default router;