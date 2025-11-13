import request from 'supertest';
import { createTestApp } from './utils/testApp';
import {
  createTestUser,
  createTestRestaurant,
  createTestVisit,
  getAuthHeader,
} from './utils/testHelpers';

const app = createTestApp();

describe('User Routes', () => {
  describe('GET /api/users/profile', () => {
    it('should return authenticated user profile', async () => {
      console.log('[TEST] Starting: should return authenticated user profile');
      const user = await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
      });
      console.log('[TEST] Created test user:', { id: user.id, username: user.username, email: user.email });

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      console.log('[TEST] Response status:', response.status);
      console.log('[TEST] Response body user:', JSON.stringify(response.body.user, null, 2));

      expect(response.body.user).toMatchObject({
        id: user.id,
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
      console.log('[TEST] ✓ Authenticated user profile test passed');
    });

    it('should include user statistics', async () => {
      console.log('[TEST] Starting: should include user statistics');
      const user = await createTestUser();
      const restaurant = await createTestRestaurant({ michelinStars: 2 });
      console.log('[TEST] Created restaurant with', restaurant.michelinStars, 'stars');
      await createTestVisit(user.id, restaurant.id);
      console.log('[TEST] Created visit for user');

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      console.log('[TEST] Response stats:', JSON.stringify(response.body.stats, null, 2));
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('byStars');
      expect(response.body.stats).toHaveProperty('byCountry');
      expect(response.body.stats).toHaveProperty('totalVisits');
      expect(response.body.stats.totalVisits).toBe(1);
      console.log('[TEST] ✓ User statistics test passed');
    });

    it('should reject unauthenticated request', async () => {
      console.log('[TEST] Starting: should reject unauthenticated request');
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      console.log('[TEST] Response status:', response.status, '(expected 401)');
      console.log('[TEST] Response error:', response.body.error);
      expect(response.body).toHaveProperty('error');
      console.log('[TEST] ✓ Unauthenticated rejection test passed');
    });

    it('should include star distribution statistics', async () => {
      console.log('[TEST] Starting: should include star distribution statistics');
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ michelinStars: 1 });
      const restaurant2 = await createTestRestaurant({ michelinStars: 3 });
      console.log('[TEST] Created 2 restaurants: 1-star and 3-star');

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);
      console.log('[TEST] Created 2 visits');

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      console.log('[TEST] Star distribution:', JSON.stringify(response.body.stats.byStars, null, 2));
      expect(response.body.stats.byStars).toHaveLength(2);
      expect(response.body.stats.byStars).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stars: 1, count: 1 }),
          expect.objectContaining({ stars: 3, count: 1 }),
        ])
      );
      console.log('[TEST] ✓ Star distribution statistics test passed');
    });

    it('should include country statistics', async () => {
      console.log('[TEST] Starting: should include country statistics');
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ country: 'France' });
      const restaurant2 = await createTestRestaurant({ country: 'Italy' });
      console.log('[TEST] Created restaurants in France and Italy');

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);
      console.log('[TEST] Created 2 visits');

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      console.log('[TEST] Country statistics:', JSON.stringify(response.body.stats.byCountry, null, 2));
      expect(response.body.stats.byCountry.length).toBeGreaterThan(0);
      expect(response.body.stats.byCountry[0]).toHaveProperty('country');
      expect(response.body.stats.byCountry[0]).toHaveProperty('count');
      console.log('[TEST] ✓ Country statistics test passed');
    });
  });

  describe('GET /api/users/profile/:username', () => {
    it('should return public user profile by username', async () => {
      console.log('[TEST] Starting: should return public user profile by username');
      const user = await createTestUser({ username: 'publicuser' });
      console.log('[TEST] Created user with username: publicuser');

      const response = await request(app)
        .get('/api/users/profile/publicuser')
        .expect(200);

      console.log('[TEST] Response status:', response.status);
      console.log('[TEST] Public profile returned:', JSON.stringify(response.body.user, null, 2));
      expect(response.body.user).toMatchObject({
        id: user.id,
        username: 'publicuser',
      });
      expect(response.body.user).not.toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      console.log('[TEST] ✓ Public user profile test passed - email and passwordHash not exposed');
    });

    it('should include recent visits in public profile', async () => {
      console.log('[TEST] Starting: should include recent visits in public profile');
      const user = await createTestUser({ username: 'visitor' });
      const restaurant = await createTestRestaurant();
      await createTestVisit(user.id, restaurant.id);
      console.log('[TEST] Created user, restaurant, and visit');

      const response = await request(app)
        .get('/api/users/profile/visitor')
        .expect(200);

      console.log('[TEST] Recent visits count:', response.body.recentVisits?.length);
      console.log('[TEST] Recent visits:', JSON.stringify(response.body.recentVisits, null, 2));
      expect(response.body).toHaveProperty('recentVisits');
      expect(response.body.recentVisits).toHaveLength(1);
      expect(response.body.recentVisits[0]).toHaveProperty('restaurant');
      console.log('[TEST] ✓ Recent visits in public profile test passed');
    });

    it('should include star statistics in public profile', async () => {
      const user = await createTestUser({ username: 'statsuser' });
      const restaurant = await createTestRestaurant({ michelinStars: 2 });
      await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .get('/api/users/profile/statsuser')
        .expect(200);

      expect(response.body.stats).toHaveProperty('byStars');
      expect(response.body.stats.byStars).toHaveLength(1);
      expect(response.body.stats.byStars[0]).toMatchObject({
        stars: 2,
        count: 1,
      });
    });

    it('should limit recent visits to 10', async () => {
      console.log('[TEST] Starting: should limit recent visits to 10');
      const user = await createTestUser({ username: 'manyvisits' });

      // Create 15 visits
      for (let i = 0; i < 15; i++) {
        const restaurant = await createTestRestaurant({ name: `Restaurant ${i}` });
        await createTestVisit(user.id, restaurant.id);
      }
      console.log('[TEST] Created 15 visits for user');

      const response = await request(app)
        .get('/api/users/profile/manyvisits')
        .expect(200);

      console.log('[TEST] Recent visits returned:', response.body.recentVisits?.length, '(expected 10)');
      expect(response.body.recentVisits).toHaveLength(10);
      console.log('[TEST] ✓ Recent visits limit test passed');
    });

    it('should return 404 for non-existent user', async () => {
      console.log('[TEST] Starting: should return 404 for non-existent user');
      const response = await request(app)
        .get('/api/users/profile/nonexistentuser')
        .expect(404);

      console.log('[TEST] Response status:', response.status, '(expected 404)');
      console.log('[TEST] Error message:', response.body.error);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
      console.log('[TEST] ✓ 404 for non-existent user test passed');
    });

    it('should work without authentication', async () => {
      console.log('[TEST] Starting: should work without authentication');
      const user = await createTestUser({ username: 'publicaccess' });
      console.log('[TEST] Created user: publicaccess');

      const response = await request(app)
        .get('/api/users/profile/publicaccess')
        // No auth header
        .expect(200);

      console.log('[TEST] Response status:', response.status, '(expected 200 without auth)');
      console.log('[TEST] Username returned:', response.body.user.username);
      expect(response.body.user.username).toBe('publicaccess');
      console.log('[TEST] ✓ Public access without authentication test passed');
    });

    it('should order recent visits by date descending', async () => {
      console.log('[TEST] Starting: should order recent visits by date descending');
      const user = await createTestUser({ username: 'orderedvisits' });
      const restaurant1 = await createTestRestaurant({ name: 'Old' });
      const restaurant2 = await createTestRestaurant({ name: 'Recent' });
      console.log('[TEST] Created restaurants: Old and Recent');

      await createTestVisit(user.id, restaurant1.id, {
        dateVisited: new Date('2023-01-01'),
      });
      await createTestVisit(user.id, restaurant2.id, {
        dateVisited: new Date('2024-01-01'),
      });
      console.log('[TEST] Created visits with dates 2023-01-01 and 2024-01-01');

      const response = await request(app)
        .get('/api/users/profile/orderedvisits')
        .expect(200);

      console.log('[TEST] Visit order:', response.body.recentVisits.map((v: any) => ({
        restaurant: v.restaurant.name,
        date: v.dateVisited
      })));
      expect(response.body.recentVisits[0].restaurant.name).toBe('Recent');
      expect(response.body.recentVisits[1].restaurant.name).toBe('Old');
      console.log('[TEST] ✓ Date ordering test passed - Recent visit first, Old visit second');
    });
  });
});
