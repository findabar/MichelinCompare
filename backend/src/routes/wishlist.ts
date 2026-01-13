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
      success: true,
      data: {
        wishlists,
        total,
        page,
        totalPages,
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

    // Try to create wishlist entry (let database unique constraint handle duplicates)
    try {
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
        success: true,
        data: {
          wishlist,
        },
      });
    } catch (dbError) {
      // Check if it's a unique constraint violation (P2002)
      if ((dbError as any).code === 'P2002') {
        return next(createError('Restaurant already in wishlist', 400));
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
});

// Update wishlist note
router.patch('/:restaurantId', async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId } = req.params;
    let { note } = req.body;
    const userId = req.userId!;

    if (note === undefined) {
      return next(createError('Note field is required', 400));
    }

    // Trim whitespace
    if (typeof note === 'string') {
      note = note.trim();
    }

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
      success: true,
      data: {
        wishlist: updatedWishlist,
      },
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

    res.json({
      success: true,
      data: {
        message: 'Restaurant removed from wishlist',
      },
    });
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
      success: true,
      data: {
        inWishlist: !!wishlist,
        wishlist: wishlist || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
