# Backend Testing Documentation

This document describes the testing infrastructure for the Michelin Star Hunter backend API.

## Test Structure

```
backend/
├── src/
│   └── __tests__/
│       ├── setup.ts                  # Global test setup and teardown
│       ├── utils/
│       │   ├── testApp.ts           # Express app for testing
│       │   └── testHelpers.ts       # Helper functions for creating test data
│       ├── auth.test.ts             # Authentication endpoint tests
│       ├── restaurants.test.ts      # Restaurant endpoint tests
│       ├── visits.test.ts           # Visit endpoint tests
│       ├── users.test.ts            # User endpoint tests
│       ├── leaderboard.test.ts      # Leaderboard endpoint tests
│       └── middleware.test.ts       # Middleware tests
├── jest.config.js                   # Jest configuration
└── TESTING.md                       # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (for test database)
- All project dependencies installed

### Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Configure test environment**:

   Create a `.env.test` file (optional) or use the defaults in `setup.ts`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/michelin_test?schema=public"
   JWT_SECRET="test-jwt-secret-key-for-testing-only"
   JWT_EXPIRES_IN="1h"
   NODE_ENV="test"
   ```

3. **Set up test database**:
   ```bash
   # Create test database
   createdb michelin_test

   # Run migrations
   DATABASE_URL="postgresql://username:password@localhost:5432/michelin_test" npx prisma migrate deploy
   ```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests with verbose output
```bash
npm run test:verbose
```

### Run specific test file
```bash
npx jest auth.test.ts
```

### Run specific test suite
```bash
npx jest -t "Authentication Routes"
```

## Test Coverage

Current test coverage includes:

### 1. Authentication Tests ([auth.test.ts](src/__tests__/auth.test.ts))
- ✅ User registration with valid data
- ✅ Registration validation (duplicate email/username, invalid formats)
- ✅ User login with valid credentials
- ✅ Login error handling (wrong password, non-existent user)
- ✅ JWT token generation and validation
- **Total: 14 test cases**

### 2. Restaurant Tests ([restaurants.test.ts](src/__tests__/restaurants.test.ts))
- ✅ List restaurants with pagination
- ✅ Filter by stars, country, city, cuisine type
- ✅ Search functionality
- ✅ Get restaurant details with visits
- ✅ Update restaurant information
- ✅ Delete restaurant and associated visits
- ✅ Get available filter options
- **Total: 20 test cases**

### 3. Visit Tests ([visits.test.ts](src/__tests__/visits.test.ts))
- ✅ Record new visit and update user score
- ✅ Prevent duplicate visits
- ✅ Get user visits with pagination
- ✅ Delete visit and update score
- ✅ Authorization checks (own visits only)
- ✅ Authentication requirements
- **Total: 18 test cases**

### 4. User Tests ([users.test.ts](src/__tests__/users.test.ts))
- ✅ Get authenticated user profile with stats
- ✅ Get public user profile by username
- ✅ Include visit statistics (by stars, by country)
- ✅ Recent visits ordering and limiting
- ✅ Privacy (email hidden in public profiles)
- **Total: 10 test cases**

### 5. Leaderboard Tests ([leaderboard.test.ts](src/__tests__/leaderboard.test.ts))
- ✅ Get users ordered by score with ranking
- ✅ Pagination support
- ✅ Tiebreaker logic (restaurant count)
- ✅ Global statistics (users, visits, restaurants)
- ✅ Top countries and star distribution
- ✅ Privacy (no sensitive data exposed)
- **Total: 13 test cases**

### 6. Middleware Tests ([middleware.test.ts](src/__tests__/middleware.test.ts))
- ✅ JWT authentication with valid token
- ✅ Reject missing/invalid/expired tokens
- ✅ Token signature verification
- ✅ Extract userId from token payload
- **Total: 8 test cases**

## Test Utilities

### Test Helpers ([src/__tests__/utils/testHelpers.ts](src/__tests__/utils/testHelpers.ts))

Provides helper functions for creating test data:

```typescript
// Create test user with hashed password and JWT
const user = await createTestUser({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123!',
  totalScore: 0,
  restaurantsVisitedCount: 0,
});

// Create test restaurant
const restaurant = await createTestRestaurant({
  name: 'Test Restaurant',
  city: 'Paris',
  country: 'France',
  michelinStars: 2,
  cuisineType: 'French',
});

// Create test visit
const visit = await createTestVisit(userId, restaurantId, {
  dateVisited: new Date(),
  notes: 'Great meal!',
});

// Get authorization header
const headers = getAuthHeader(user.token);
```

### Test App ([src/__tests__/utils/testApp.ts](src/__tests__/utils/testApp.ts))

Creates an Express app instance for testing without starting the actual server.

### Test Setup ([src/__tests__/setup.ts](src/__tests__/setup.ts))

- Sets test environment variables
- Cleans database after each test
- Disconnects Prisma after all tests

## Writing New Tests

### Example Test Structure

```typescript
import request from 'supertest';
import { createTestApp } from './utils/testApp';
import { createTestUser, getAuthHeader } from './utils/testHelpers';

const app = createTestApp();

describe('Feature Name', () => {
  describe('GET /api/endpoint', () => {
    it('should return expected result', async () => {
      // Arrange
      const user = await createTestUser();

      // Act
      const response = await request(app)
        .get('/api/endpoint')
        .set(getAuthHeader(user.token))
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        key: 'expected-value',
      });
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: Tests should read like documentation
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Clean up after yourself**: The setup file handles database cleanup
4. **Test edge cases**: Invalid inputs, missing data, authorization failures
5. **Use test helpers**: Don't duplicate user/restaurant/visit creation code
6. **Run tests in isolation**: Use `--runInBand` to avoid race conditions
7. **Mock external services**: Don't make actual API calls or send emails
8. **Test authentication**: Always test both authenticated and unauthenticated paths

## Continuous Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: michelin_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm install

      - name: Run migrations
        run: |
          cd backend
          npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/michelin_test

      - name: Run tests
        run: |
          cd backend
          npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/michelin_test
          JWT_SECRET: test-secret-key
```

## Troubleshooting

### Tests failing with database connection errors

**Problem**: Cannot connect to test database

**Solution**:
```bash
# Make sure PostgreSQL is running
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# Create test database if it doesn't exist
createdb michelin_test

# Run migrations
DATABASE_URL="postgresql://user:pass@localhost:5432/michelin_test" npx prisma migrate deploy
```

### Tests timing out

**Problem**: Tests exceed timeout limit

**Solution**: Increase timeout in jest.config.js or individual tests:
```typescript
it('slow test', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Prisma client errors

**Problem**: "Prisma Client not initialized" or similar errors

**Solution**:
```bash
npx prisma generate
```

### Port conflicts

**Problem**: Address already in use

**Solution**: Tests don't start a server, but if you're running dev server:
```bash
lsof -ti:3001 | xargs kill -9
```

## Test Statistics

| Test Suite       | Tests | Passing | Coverage |
|-----------------|-------|---------|----------|
| Authentication  | 14    | ✅ 14   | ~95%     |
| Restaurants     | 20    | ✅ 20   | ~90%     |
| Visits          | 18    | ✅ 18   | ~95%     |
| Users           | 10    | ✅ 10   | ~90%     |
| Leaderboard     | 13    | ✅ 13   | ~90%     |
| Middleware      | 8     | ✅ 8    | ~95%     |
| **Total**       | **83**| **✅ 83**| **~92%** |

## Future Improvements

- [ ] Add integration tests for scraper service
- [ ] Add tests for email notification service
- [ ] Add tests for feedback endpoints
- [ ] Add performance/load testing
- [ ] Add E2E tests with Playwright
- [ ] Set up test coverage thresholds in CI
- [ ] Add mutation testing
- [ ] Mock external API calls (OpenAI)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues with tests:
1. Check this documentation
2. Review test error messages
3. Check database connection
4. Verify environment variables
5. Create an issue in the repository
