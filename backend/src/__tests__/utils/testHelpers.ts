import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma';
import { generateToken } from '../../utils/jwt';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string;
  token: string;
}

export interface TestRestaurant {
  id: string;
  name: string;
  city: string;
  country: string;
  michelinStars: number;
  cuisineType: string;
}

/**
 * Create a test user with hashed password and JWT token
 */
export async function createTestUser(
  overrides: Partial<{
    username: string;
    email: string;
    password: string;
    admin: boolean;
    totalScore: number;
    restaurantsVisitedCount: number;
  }> = {}
): Promise<TestUser> {
  const username = overrides.username || `testuser_${Date.now()}`;
  const email = overrides.email || `test_${Date.now()}@example.com`;
  const password = overrides.password || 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      admin: overrides.admin || false,
      totalScore: overrides.totalScore || 0,
      restaurantsVisitedCount: overrides.restaurantsVisitedCount || 0,
    },
  });

  const token = generateToken({ userId: user.id });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password,
    token,
  };
}

/**
 * Create a test restaurant
 */
export async function createTestRestaurant(
  overrides: Partial<{
    name: string;
    city: string;
    country: string;
    michelinStars: number;
    cuisineType: string;
    yearAwarded: number;
    address: string;
    latitude: number;
    longitude: number;
    description: string;
  }> = {}
): Promise<TestRestaurant> {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: overrides.name || `Test Restaurant ${Date.now()}`,
      city: overrides.city || 'Paris',
      country: overrides.country || 'France',
      michelinStars: overrides.michelinStars || 1,
      cuisineType: overrides.cuisineType || 'French',
      yearAwarded: overrides.yearAwarded || 2024,
      address: overrides.address || '123 Test Street',
      latitude: overrides.latitude || null,
      longitude: overrides.longitude || null,
      description: overrides.description || null,
    },
  });

  return {
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.city,
    country: restaurant.country,
    michelinStars: restaurant.michelinStars,
    cuisineType: restaurant.cuisineType,
  };
}

/**
 * Create a test visit for a user and restaurant
 */
export async function createTestVisit(
  userId: string,
  restaurantId: string,
  overrides: Partial<{
    dateVisited: Date;
    notes: string;
  }> = {}
) {
  // Get restaurant to know the michelin stars
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Create the visit
  const visit = await prisma.userVisit.create({
    data: {
      userId,
      restaurantId,
      dateVisited: overrides.dateVisited || new Date(),
      notes: overrides.notes || null,
    },
  });

  // Update user's score and visit count
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

  return visit;
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  await prisma.userVisit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
}

/**
 * Get authorization header with JWT token
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
