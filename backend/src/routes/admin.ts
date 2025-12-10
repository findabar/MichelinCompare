import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth';
import geocodingService from '../services/geocoding';

const router = Router();
const prisma = new PrismaClient();

// Track geocoding progress in memory
let geocodingProgress = {
  inProgress: false,
  processed: 0,
  total: 0,
  successful: 0,
  failed: 0,
  errors: [] as Array<{ restaurantId: string; name: string; error: string }>,
};

/**
 * POST /api/admin/geocode-restaurants
 * Geocode restaurants based on filter criteria
 */
router.post('/geocode-restaurants', adminAuth, async (req, res) => {
  try {
    const { filter, starLevel, name, restaurantId, force = false } = req.body;

    if (!['all', 'stars', 'name', 'single'].includes(filter)) {
      return res.status(400).json({
        error: 'Invalid filter. Must be one of: all, stars, name, single',
      });
    }

    if (geocodingProgress.inProgress) {
      return res.status(409).json({
        error: 'Geocoding is already in progress',
        progress: geocodingProgress,
      });
    }

    // Build query based on filter
    let whereClause: any = {
      NOT: [
        { address: null },
        { address: '' }
      ]
    };

    // If not forcing, only select restaurants without coordinates
    if (!force) {
      whereClause.OR = [{ latitude: null }, { longitude: null }];
    }

    // Apply filter-specific conditions
    if (filter === 'stars') {
      if (!starLevel || ![1, 2, 3].includes(starLevel)) {
        return res.status(400).json({
          error: 'starLevel is required and must be 1, 2, or 3 when filter is "stars"',
        });
      }
      whereClause.michelinStars = starLevel;
    } else if (filter === 'name') {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: 'name is required when filter is "name"',
        });
      }
      whereClause.name = {
        contains: name,
        mode: 'insensitive' as const,
      };
    } else if (filter === 'single') {
      if (!restaurantId) {
        return res.status(400).json({
          error: 'restaurantId is required when filter is "single"',
        });
      }
      whereClause.id = restaurantId;
    }

    // Fetch restaurants to geocode
    const restaurants = await prisma.restaurant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });

    if (restaurants.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No restaurants found matching the criteria',
        stats: {
          total: 0,
          queued: 0,
          alreadyGeocoded: 0,
        },
      });
    }

    const alreadyGeocoded = force
      ? 0
      : restaurants.filter((r) => r.latitude !== null && r.longitude !== null).length;

    // Initialize progress
    geocodingProgress = {
      inProgress: true,
      processed: 0,
      total: restaurants.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Send immediate response
    res.status(202).json({
      success: true,
      message: `Started geocoding ${restaurants.length} restaurant${restaurants.length > 1 ? 's' : ''}`,
      stats: {
        total: restaurants.length,
        queued: restaurants.length,
        alreadyGeocoded,
        force,
      },
    });

    // Process geocoding in background
    processGeocoding(restaurants).catch((error) => {
      console.error('❌ Geocoding process error:', error);
      geocodingProgress.inProgress = false;
    });
  } catch (error) {
    console.error('Error starting geocoding:', error);
    res.status(500).json({
      error: 'Failed to start geocoding',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/geocoding-status
 * Get current geocoding progress
 */
router.get('/geocoding-status', adminAuth, async (req, res) => {
  res.json(geocodingProgress);
});

/**
 * Background geocoding processor
 */
async function processGeocoding(
  restaurants: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  }>
) {
  console.log(`🚀 Starting geocoding for ${restaurants.length} restaurants`);

  const addressesToGeocode: Array<{ id: string; address: string; name: string }> = restaurants.map((r) => ({
    id: r.id,
    address: `${r.address || ''}, ${r.city}, ${r.country}`.trim(),
    name: r.name,
  }));

  try {
    const result = await geocodingService.geocodeBatch(
      addressesToGeocode,
      (processed, total, current) => {
        geocodingProgress.processed = processed + 1;
        console.log(`📍 Geocoding [${processed + 1}/${total}]: ${current.address}`);
      }
    );

    // Update database with successful results
    for (const item of result.successful) {
      try {
        await prisma.restaurant.update({
          where: { id: item.id },
          data: {
            latitude: item.result.latitude,
            longitude: item.result.longitude,
          },
        });
        geocodingProgress.successful++;
      } catch (error) {
        console.error(`Failed to update restaurant ${item.id}:`, error);
        geocodingProgress.failed++;
        geocodingProgress.errors.push({
          restaurantId: item.id,
          name: addressesToGeocode.find((a) => a.id === item.id)?.name || 'Unknown',
          error: 'Database update failed',
        });
      }
    }

    // Track failed geocoding attempts
    for (const item of result.failed) {
      geocodingProgress.failed++;
      geocodingProgress.errors.push({
        restaurantId: item.id,
        name: addressesToGeocode.find((a) => a.id === item.id)?.name || 'Unknown',
        error: item.error,
      });
    }

    geocodingProgress.inProgress = false;

    console.log(`✅ Geocoding complete!`);
    console.log(`   Successful: ${geocodingProgress.successful}`);
    console.log(`   Failed: ${geocodingProgress.failed}`);
    console.log(`   Total processed: ${geocodingProgress.processed}`);
  } catch (error) {
    console.error('❌ Geocoding batch process failed:', error);
    geocodingProgress.inProgress = false;
    throw error;
  }
}

export default router;
