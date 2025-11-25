import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { createError } from '../middleware/errorHandler';
import adminAuth from '../middleware/adminAuth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  name: string;
  matchedOn: string[];
  restaurantIds: string[];
  restaurants: {
    id: string;
    name: string;
    city: string;
    country: string;
    cuisineType: string;
    michelinStars: number;
  }[];
}

// Function to find potential duplicate restaurants
async function findDuplicateRestaurants(): Promise<DuplicateGroup[]> {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      cuisineType: true,
      michelinStars: true,
    },
    orderBy: { name: 'asc' },
  });

  // Group by normalized name (lowercase, trimmed)
  const nameGroups = new Map<string, typeof restaurants>();

  for (const restaurant of restaurants) {
    const normalizedName = restaurant.name.toLowerCase().trim();
    const group = nameGroups.get(normalizedName) || [];
    group.push(restaurant);
    nameGroups.set(normalizedName, group);
  }

  const duplicates: DuplicateGroup[] = [];

  // Check each group with multiple restaurants
  for (const [, group] of nameGroups) {
    if (group.length < 2) continue;

    // Check for additional matching fields
    const matchedOn: string[] = [];

    // Check if all share same city
    const cities = new Set(group.map(r => r.city.toLowerCase().trim()));
    if (cities.size === 1) matchedOn.push('city');

    // Check if all share same country
    const countries = new Set(group.map(r => r.country.toLowerCase().trim()));
    if (countries.size === 1) matchedOn.push('country');

    // Check if all share same cuisine type
    const cuisines = new Set(group.map(r => r.cuisineType.toLowerCase().trim()));
    if (cuisines.size === 1) matchedOn.push('cuisineType');

    // Check if all share same star rating
    const stars = new Set(group.map(r => r.michelinStars));
    if (stars.size === 1) matchedOn.push('michelinStars');

    // Only include if at least one additional field matches
    if (matchedOn.length > 0) {
      duplicates.push({
        name: group[0].name,
        matchedOn,
        restaurantIds: group.map(r => r.id),
        restaurants: group,
      });
    }
  }

  return duplicates;
}

// Helper function to pick the best string value (prefer non-empty, non-unknown)
function pickBestString(values: (string | null | undefined)[]): string {
  const validValues = values.filter(v =>
    v &&
    v.trim() !== '' &&
    v.toLowerCase() !== 'unknown' &&
    v.toLowerCase() !== 'n/a' &&
    v.toLowerCase() !== 'none'
  );
  return validValues[0] || values.find(v => v && v.trim() !== '') || '';
}

// Helper function to pick the best number value (prefer non-zero)
function pickBestNumber(values: (number | null | undefined)[]): number {
  const validValues = values.filter(v => v !== null && v !== undefined && v !== 0);
  return validValues[0] || values.find(v => v !== null && v !== undefined) || 0;
}

// Helper function to pick the best optional value (prefer non-null)
function pickBestOptional<T>(values: (T | null | undefined)[]): T | null {
  return values.find(v => v !== null && v !== undefined) || null;
}

// Function to merge duplicate restaurants
async function mergeRestaurants(restaurantIds: string[]): Promise<{
  mergedId: string;
  deletedIds: string[];
  mergedData: any;
  visitsTransferred: number;
}> {
  if (restaurantIds.length < 2) {
    throw new Error('At least 2 restaurant IDs are required for merging');
  }

  // Fetch all restaurants to merge
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: restaurantIds } },
  });

  if (restaurants.length !== restaurantIds.length) {
    const foundIds = restaurants.map(r => r.id);
    const missingIds = restaurantIds.filter(id => !foundIds.includes(id));
    throw new Error(`Restaurants not found: ${missingIds.join(', ')}`);
  }

  // Keep the first restaurant, merge data from others
  const primaryRestaurant = restaurants[0];
  const idsToDelete = restaurantIds.slice(1);

  // Merge data, picking best values
  const mergedData = {
    name: pickBestString(restaurants.map(r => r.name)),
    city: pickBestString(restaurants.map(r => r.city)),
    country: pickBestString(restaurants.map(r => r.country)),
    cuisineType: pickBestString(restaurants.map(r => r.cuisineType)),
    michelinStars: pickBestNumber(restaurants.map(r => r.michelinStars)),
    yearAwarded: pickBestNumber(restaurants.map(r => r.yearAwarded)),
    address: pickBestString(restaurants.map(r => r.address)),
    latitude: pickBestOptional(restaurants.map(r => r.latitude)),
    longitude: pickBestOptional(restaurants.map(r => r.longitude)),
    description: pickBestOptional(restaurants.map(r => r.description)),
    imageUrl: pickBestOptional(restaurants.map(r => r.imageUrl)),
    phone: pickBestOptional(restaurants.map(r => r.phone)),
    website: pickBestOptional(restaurants.map(r => r.website)),
    michelinUrl: pickBestOptional(restaurants.map(r => r.michelinUrl)),
  };

  // Use transaction to ensure data consistency
  const result = await prisma.$transaction(async (tx) => {
    // Update primary restaurant with merged data
    await tx.restaurant.update({
      where: { id: primaryRestaurant.id },
      data: mergedData,
    });

    // Transfer visits from deleted restaurants to primary
    // First, get visits that would create duplicates
    const existingVisits = await tx.userVisit.findMany({
      where: { restaurantId: primaryRestaurant.id },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingVisits.map(v => v.userId));

    // Delete visits that would create duplicates
    await tx.userVisit.deleteMany({
      where: {
        restaurantId: { in: idsToDelete },
        userId: { in: Array.from(existingUserIds) },
      },
    });

    // Transfer remaining visits to primary restaurant
    const updateResult = await tx.userVisit.updateMany({
      where: { restaurantId: { in: idsToDelete } },
      data: { restaurantId: primaryRestaurant.id },
    });

    // Delete duplicate restaurants
    await tx.restaurant.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return updateResult.count;
  });

  return {
    mergedId: primaryRestaurant.id,
    deletedIds: idsToDelete,
    mergedData,
    visitsTransferred: result,
  };
}

const router = express.Router();

// Scraper service URL - this should be set via environment variable
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002';

// Helper function for making HTTP requests
function makeRequest(url: string, options: { method?: string; data?: any } = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.data && { 'Content-Length': Buffer.byteLength(JSON.stringify(options.data)) })
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error || res.statusMessage}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

// POST /api/scraper/start - Start the scraping process (requires authentication)
router.post('/start', adminAuth, async (req, res, next) => {
  try {
    const { stars } = req.body;

    console.log(`🚀 Triggering scraper service${stars ? ` for ${Array.isArray(stars) ? stars.join(', ') : stars} star restaurants` : ''}...`);

    // Prepare request data
    const requestData: any = {};
    if (stars !== undefined) {
      requestData.stars = stars;
    }

    // Call the scraper service
    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/scrape`, {
      method: 'POST',
      data: requestData
    });

    res.status(202).json({
      message: `Scraper started successfully via scraper service${stars ? ` for ${Array.isArray(stars) ? stars.join(', ') : stars} star restaurants` : ''}`,
      scraperService: SCRAPER_SERVICE_URL,
      targetStars: stars,
      result
    });

  } catch (error) {
    console.error('❌ Failed to start scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to start scraper: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/status - Get current scraper status
router.get('/status', async (_req, res, next) => {
  try {
    console.log('📊 Fetching scraper status from service...');

    const status = await makeRequest(`${SCRAPER_SERVICE_URL}/status`);

    res.json({
      ...status,
      scraperService: SCRAPER_SERVICE_URL
    });

  } catch (error) {
    console.error('❌ Failed to get scraper status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return res.json({
        isRunning: false,
        error: 'Scraper service unavailable',
        scraperService: SCRAPER_SERVICE_URL,
        lastRun: null,
        progress: 'Service unavailable',
        result: null
      });
    }

    next(createError(`Failed to get scraper status: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/stop - Stop the scraping process (requires authentication)
router.post('/stop', adminAuth, async (_req, res, next) => {
  try {
    console.log('🛑 Stopping scraper service...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/stop`, {
      method: 'POST'
    });

    res.json({
      message: 'Scraper stop requested via scraper service',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to stop scraper service:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable', 503));
    }

    next(createError(`Failed to stop scraper: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/update-locations - Start location update process (requires authentication)
router.post('/update-locations', adminAuth, async (_req, res, next) => {
  try {
    console.log('🗺️  Triggering location update process...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/update-locations`, {
      method: 'POST'
    });

    res.status(202).json({
      message: 'Location update process started successfully',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to start location update process:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to start location update: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/location-status - Get location update status
router.get('/location-status', async (_req, res, next) => {
  try {
    console.log('📊 Fetching location update status from service...');

    const status = await makeRequest(`${SCRAPER_SERVICE_URL}/location-status`);

    res.json({
      ...status,
      scraperService: SCRAPER_SERVICE_URL
    });

  } catch (error) {
    console.error('❌ Failed to get location update status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return res.json({
        isRunning: false,
        error: 'Scraper service unavailable',
        scraperService: SCRAPER_SERVICE_URL,
        lastRun: null,
        progress: 'Service unavailable',
        result: null
      });
    }

    next(createError(`Failed to get location update status: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/stop-location-update - Stop location update process (requires authentication)
router.post('/stop-location-update', adminAuth, async (_req, res, next) => {
  try {
    console.log('🛑 Stopping location update process...');

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/stop-location-update`, {
      method: 'POST'
    });

    res.json({
      message: 'Location update stop requested',
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to stop location update process:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable', 503));
    }

    next(createError(`Failed to stop location update: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/test-restaurant - Test single restaurant lookup (requires authentication)
router.post('/test-restaurant', adminAuth, async (req, res, next) => {
  try {
    const { restaurantName } = req.body;

    if (!restaurantName) {
      return res.status(400).json({
        error: 'Restaurant name is required in request body',
        example: { restaurantName: 'Le Bernardin' }
      });
    }

    console.log(`🧪 Testing restaurant lookup via backend for: ${restaurantName}`);

    const result = await makeRequest(`${SCRAPER_SERVICE_URL}/test-restaurant`, {
      method: 'POST',
      data: { restaurantName }
    });

    res.json({
      message: `Restaurant test completed for: ${restaurantName}`,
      scraperService: SCRAPER_SERVICE_URL,
      result
    });

  } catch (error) {
    console.error('❌ Failed to test restaurant lookup:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to test restaurant lookup: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/duplicates - Find potential duplicate restaurants in database
router.get('/duplicates', async (_req, res, next) => {
  try {
    console.log('🔍 Checking database for potential duplicate restaurants...');

    const duplicates = await findDuplicateRestaurants();

    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.restaurants.length, 0);

    res.json({
      message: `Found ${duplicates.length} potential duplicate groups (${totalDuplicates} restaurants)`,
      duplicateGroups: duplicates.length,
      totalRestaurants: totalDuplicates,
      duplicates,
    });

  } catch (error) {
    console.error('❌ Failed to find duplicate restaurants:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    next(createError(`Failed to find duplicates: ${errorMessage}`, 500));
  }
});

// GET /api/scraper/preview-update/:id - Preview update data for a single restaurant (requires authentication)
router.get('/preview-update/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get current restaurant data from database
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      return res.status(404).json({
        error: 'Restaurant not found',
      });
    }

    console.log(`🔍 Fetching preview update for: ${restaurant.name}`);

    // Call the scraper service to get fresh data from Michelin
    const scraperResult = await makeRequest(`${SCRAPER_SERVICE_URL}/test-restaurant`, {
      method: 'POST',
      data: { restaurantName: restaurant.name }
    });

    // Find the best matching restaurant from scraper results
    let matchedRestaurant = null;
    if (scraperResult.result?.restaurants?.length > 0) {
      // Try to find exact match first
      matchedRestaurant = scraperResult.result.restaurants.find(
        (r: any) => r.name.toLowerCase() === restaurant.name.toLowerCase()
      );
      // If no exact match, use the first result
      if (!matchedRestaurant) {
        matchedRestaurant = scraperResult.result.restaurants[0];
      }
    }

    // If no restaurant found in scraped data, return 404
    if (!matchedRestaurant) {
      return next(createError(`Restaurant "${restaurant.name}" not found in scraped data`, 404));
    }

    // If we found a match, also fetch the restaurant page for more details
    let additionalDetails = {};
    if (matchedRestaurant?.url) {
      try {
        // Get detailed info from the restaurant page via a new scraper endpoint
        // For now, we'll work with what we have from the search results
        additionalDetails = {
          michelinUrl: matchedRestaurant.url,
        };
      } catch (err) {
        console.log('Could not fetch additional details from restaurant page');
      }
    }

    // Build comparison data
    const comparison = {
      current: {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        country: restaurant.country,
        cuisineType: restaurant.cuisineType,
        michelinStars: restaurant.michelinStars,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        description: restaurant.description,
        michelinUrl: restaurant.michelinUrl,
      },
      scraped: matchedRestaurant ? {
        name: matchedRestaurant.name,
        city: matchedRestaurant.city,
        country: matchedRestaurant.country,
        cuisineType: matchedRestaurant.cuisine,
        michelinStars: matchedRestaurant.michelinStars ? parseInt(matchedRestaurant.michelinStars) : null,
        distinction: matchedRestaurant.distinction || null,
        description: matchedRestaurant.description,
        michelinUrl: matchedRestaurant.url,
      } : null,
      differences: [] as string[],
    };

    // Calculate differences
    if (matchedRestaurant) {
      if (matchedRestaurant.name && matchedRestaurant.name !== restaurant.name) {
        comparison.differences.push('name');
      }
      if (matchedRestaurant.city && matchedRestaurant.city !== restaurant.city) {
        comparison.differences.push('city');
      }
      if (matchedRestaurant.country && matchedRestaurant.country !== restaurant.country) {
        comparison.differences.push('country');
      }
      if (matchedRestaurant.cuisine && matchedRestaurant.cuisine !== restaurant.cuisineType) {
        comparison.differences.push('cuisineType');
      }
      if (matchedRestaurant.michelinStars && parseInt(matchedRestaurant.michelinStars) !== restaurant.michelinStars) {
        comparison.differences.push('michelinStars');
      }
      if (matchedRestaurant.description && matchedRestaurant.description !== restaurant.description) {
        comparison.differences.push('description');
      }
      if (matchedRestaurant.url && matchedRestaurant.url !== restaurant.michelinUrl) {
        comparison.differences.push('michelinUrl');
      }
    }

    // Check if restaurant has lost its stars
    const lostStars = restaurant.michelinStars > 0 &&
                      matchedRestaurant.michelinStars !== undefined &&
                      parseInt(matchedRestaurant.michelinStars) < restaurant.michelinStars;

    // Add lostStars flag to comparison
    (comparison as any).lostStars = lostStars;

    res.json({
      success: true,
      restaurantId: id,
      comparison,
      hasDifferences: comparison.differences.length > 0,
      scraperResult: scraperResult.result,
    });

  } catch (error) {
    console.error('❌ Failed to preview restaurant update:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('Request failed')) {
      return next(createError('Scraper service unavailable. Please ensure the scraper service is running.', 503));
    }

    next(createError(`Failed to preview update: ${errorMessage}`, 500));
  }
});

// POST /api/scraper/merge - Automatically find and merge all duplicate restaurants (requires authentication)
router.post('/merge', adminAuth, async (_req, res, next) => {
  try {
    console.log('🔍 Finding duplicate restaurants to merge...');

    // Find all duplicate groups
    const duplicates = await findDuplicateRestaurants();

    if (duplicates.length === 0) {
      return res.json({
        message: 'No duplicate restaurants found to merge',
        groupsMerged: 0,
        totalRestaurantsDeleted: 0,
        totalVisitsTransferred: 0,
        results: [],
      });
    }

    console.log(`🔀 Found ${duplicates.length} duplicate groups to merge`);

    // Merge each duplicate group separately
    const results: {
      groupName: string;
      mergedId: string;
      deletedIds: string[];
      visitsTransferred: number;
    }[] = [];

    let totalDeleted = 0;
    let totalVisitsTransferred = 0;

    for (const group of duplicates) {
      try {
        console.log(`  Merging group: ${group.name} (${group.restaurantIds.length} restaurants)`);

        const result = await mergeRestaurants(group.restaurantIds);

        results.push({
          groupName: group.name,
          mergedId: result.mergedId,
          deletedIds: result.deletedIds,
          visitsTransferred: result.visitsTransferred,
        });

        totalDeleted += result.deletedIds.length;
        totalVisitsTransferred += result.visitsTransferred;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Failed to merge group ${group.name}: ${errorMessage}`);

        results.push({
          groupName: group.name,
          mergedId: 'error',
          deletedIds: [],
          visitsTransferred: 0,
        });
      }
    }

    res.json({
      message: `Successfully merged ${duplicates.length} duplicate groups`,
      groupsMerged: duplicates.length,
      totalRestaurantsDeleted: totalDeleted,
      totalVisitsTransferred,
      results,
    });

  } catch (error) {
    console.error('❌ Failed to merge duplicate restaurants:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    next(createError(`Failed to merge duplicates: ${errorMessage}`, 500));
  }
});


export default router;