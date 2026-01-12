import express from 'express';
import { prisma } from '../utils/prisma';
import { wishlistSchema } from '../utils/validation';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

router.use(authenticateToken);

// Get user's wishlist
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [wishlists, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId },
        include: {
          restaurant: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.wishlist.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      wishlists,
      pagination: {
        current: page,
        total: totalPages,
        count: wishlists.length,
        totalCount: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add restaurant to wishlist
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = wishlistSchema.validate(req.body);
    if (error) {
      return next(createError(error.details[0].message, 400));
    }

    const { restaurantId, note } = value;
    const userId = req.userId!;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return next(createError('Restaurant not found', 404));
    }

    // Check if already in wishlist
    const existingWishlist = await prisma.wishlist.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (existingWishlist) {
      return next(createError('Restaurant is already in your wishlist', 400));
    }

    // Create wishlist entry
    const wishlist = await prisma.wishlist.create({
      data: {
        userId,
        restaurantId,
        note,
      },
      include: {
        restaurant: true,
      },
    });

    res.status(201).json({
      message: 'Restaurant added to wishlist',
      wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// Update wishlist note
router.patch('/:restaurantId', async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { note } = req.body;
    const userId = req.userId!;

    const wishlist = await prisma.wishlist.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (!wishlist) {
      return next(createError('Wishlist entry not found', 404));
    }

    const updatedWishlist = await prisma.wishlist.update({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
      data: {
        note,
      },
      include: {
        restaurant: true,
      },
    });

    res.json({
      message: 'Wishlist note updated',
      wishlist: updatedWishlist,
    });
  } catch (error) {
    next(error);
  }
});

// Remove restaurant from wishlist
router.delete('/:restaurantId', async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.userId!;

    const wishlist = await prisma.wishlist.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (!wishlist) {
      return next(createError('Wishlist entry not found', 404));
    }

    await prisma.wishlist.delete({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    res.json({ message: 'Restaurant removed from wishlist' });
  } catch (error) {
    next(error);
  }
});

// Check if restaurant is in user's wishlist
router.get('/check/:restaurantId', async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.userId!;

    const wishlist = await prisma.wishlist.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
      include: {
        restaurant: true,
      },
    });

    res.json({
      inWishlist: !!wishlist,
      wishlist: wishlist || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
