// Set test environment variables BEFORE importing anything that uses them
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost:5432/michelin_star_hunter_test?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

import { prisma } from '../utils/prisma';

// Clean up database before each test suite
beforeAll(async () => {
  // Environment already set above
});

// Clean up database after each test
afterEach(async () => {
  // Delete in order of dependencies
  await prisma.userVisit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
