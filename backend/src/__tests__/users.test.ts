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
      const user = await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: user.id,
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should include user statistics', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant({ michelinStars: 2 });
      await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('byStars');
      expect(response.body.stats).toHaveProperty('byCountry');
      expect(response.body.stats).toHaveProperty('totalVisits');
      expect(response.body.stats.totalVisits).toBe(1);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should include star distribution statistics', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ michelinStars: 1 });
      const restaurant2 = await createTestRestaurant({ michelinStars: 3 });

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.stats.byStars).toHaveLength(2);
      expect(response.body.stats.byStars).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stars: 1, count: 1 }),
          expect.objectContaining({ stars: 3, count: 1 }),
        ])
      );
    });

    it('should include country statistics', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ country: 'France' });
      const restaurant2 = await createTestRestaurant({ country: 'Italy' });

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);

      const response = await request(app)
        .get('/api/users/profile')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.stats.byCountry.length).toBeGreaterThan(0);
      expect(response.body.stats.byCountry[0]).toHaveProperty('country');
      expect(response.body.stats.byCountry[0]).toHaveProperty('count');
    });
  });

  describe('GET /api/users/profile/:username', () => {
    it('should return public user profile by username', async () => {
      const user = await createTestUser({ username: 'publicuser' });

      const response = await request(app)
        .get('/api/users/profile/publicuser')
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: user.id,
        username: 'publicuser',
      });
      expect(response.body.user).not.toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should include recent visits in public profile', async () => {
      const user = await createTestUser({ username: 'visitor' });
      const restaurant = await createTestRestaurant();
      await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .get('/api/users/profile/visitor')
        .expect(200);

      expect(response.body).toHaveProperty('recentVisits');
      expect(response.body.recentVisits).toHaveLength(1);
      expect(response.body.recentVisits[0]).toHaveProperty('restaurant');
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
      const user = await createTestUser({ username: 'manyvisits' });

      // Create 15 visits
      for (let i = 0; i < 15; i++) {
        const restaurant = await createTestRestaurant({ name: `Restaurant ${i}` });
        await createTestVisit(user.id, restaurant.id);
      }

      const response = await request(app)
        .get('/api/users/profile/manyvisits')
        .expect(200);

      expect(response.body.recentVisits).toHaveLength(10);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/profile/nonexistentuser')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should work without authentication', async () => {
      const user = await createTestUser({ username: 'publicaccess' });

      const response = await request(app)
        .get('/api/users/profile/publicaccess')
        // No auth header
        .expect(200);

      expect(response.body.user.username).toBe('publicaccess');
    });

    it('should order recent visits by date descending', async () => {
      const user = await createTestUser({ username: 'orderedvisits' });
      const restaurant1 = await createTestRestaurant({ name: 'Old' });
      const restaurant2 = await createTestRestaurant({ name: 'Recent' });

      await createTestVisit(user.id, restaurant1.id, {
        dateVisited: new Date('2023-01-01'),
      });
      await createTestVisit(user.id, restaurant2.id, {
        dateVisited: new Date('2024-01-01'),
      });

      const response = await request(app)
        .get('/api/users/profile/orderedvisits')
        .expect(200);

      expect(response.body.recentVisits[0].restaurant.name).toBe('Recent');
      expect(response.body.recentVisits[1].restaurant.name).toBe('Old');
    });
  });
});
