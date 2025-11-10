import request from 'supertest';
import { createTestApp } from './utils/testApp';
import {
  createTestUser,
  createTestRestaurant,
  createTestVisit,
} from './utils/testHelpers';

const app = createTestApp();

describe('Leaderboard Routes', () => {
  describe('GET /api/leaderboard', () => {
    it('should return users ordered by total score', async () => {
      const user1 = await createTestUser({ totalScore: 5 });
      const user2 = await createTestUser({ totalScore: 10 });
      const user3 = await createTestUser({ totalScore: 3 });

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toHaveLength(3);

      // Check ordering (highest score first)
      expect(response.body.users[0].totalScore).toBe(10);
      expect(response.body.users[1].totalScore).toBe(5);
      expect(response.body.users[2].totalScore).toBe(3);
    });

    it('should include rank for each user', async () => {
      await createTestUser({ totalScore: 10 });
      await createTestUser({ totalScore: 5 });

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body.users[0].rank).toBe(1);
      expect(response.body.users[1].rank).toBe(2);
    });

    it('should support pagination', async () => {
      // Create 5 users with different scores
      for (let i = 1; i <= 5; i++) {
        await createTestUser({ totalScore: i * 2 });
      }

      const page1 = await request(app)
        .get('/api/leaderboard')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1.body.users).toHaveLength(2);
      expect(page1.body.pagination.current).toBe(1);
      expect(page1.body.users[0].rank).toBe(1);
      expect(page1.body.users[1].rank).toBe(2);

      const page2 = await request(app)
        .get('/api/leaderboard')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.users).toHaveLength(2);
      expect(page2.body.pagination.current).toBe(2);
      expect(page2.body.users[0].rank).toBe(3);
      expect(page2.body.users[1].rank).toBe(4);
    });

    it('should use restaurant count as tiebreaker', async () => {
      // Same score but different visit counts
      const user1 = await createTestUser({
        totalScore: 5,
        restaurantsVisitedCount: 3,
      });
      const user2 = await createTestUser({
        totalScore: 5,
        restaurantsVisitedCount: 5,
      });

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      // User with more visits should rank higher
      expect(response.body.users[0].restaurantsVisitedCount).toBe(5);
      expect(response.body.users[1].restaurantsVisitedCount).toBe(3);
    });

    it('should not expose sensitive user data', async () => {
      await createTestUser({ email: 'secret@example.com' });

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body.users[0]).not.toHaveProperty('email');
      expect(response.body.users[0]).not.toHaveProperty('passwordHash');
      expect(response.body.users[0]).toHaveProperty('username');
      expect(response.body.users[0]).toHaveProperty('totalScore');
    });

    it('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body.users).toHaveLength(0);
      expect(response.body.pagination.totalCount).toBe(0);
    });

    it('should handle default pagination values', async () => {
      await createTestUser();

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        current: 1,
        total: expect.any(Number),
        count: expect.any(Number),
        totalCount: expect.any(Number),
      });
    });
  });

  describe('GET /api/leaderboard/stats', () => {
    it('should return global statistics', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();
      await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        totalUsers: expect.any(Number),
        totalVisits: expect.any(Number),
        totalRestaurants: expect.any(Number),
      });
      expect(response.body.totalUsers).toBeGreaterThan(0);
      expect(response.body.totalVisits).toBeGreaterThan(0);
      expect(response.body.totalRestaurants).toBeGreaterThan(0);
    });

    it('should include top countries statistics', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ country: 'France' });
      const restaurant2 = await createTestRestaurant({ country: 'Italy' });

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body).toHaveProperty('topCountries');
      expect(Array.isArray(response.body.topCountries)).toBe(true);
      expect(response.body.topCountries.length).toBeGreaterThan(0);
      expect(response.body.topCountries[0]).toMatchObject({
        country: expect.any(String),
        unique_visitors: expect.any(Number),
        total_visits: expect.any(Number),
      });
    });

    it('should include star distribution statistics', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ michelinStars: 1 });
      const restaurant2 = await createTestRestaurant({ michelinStars: 3 });

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body).toHaveProperty('starDistribution');
      expect(Array.isArray(response.body.starDistribution)).toBe(true);
      expect(response.body.starDistribution.length).toBeGreaterThan(0);
      expect(response.body.starDistribution[0]).toMatchObject({
        stars: expect.any(Number),
        visit_count: expect.any(Number),
        unique_visitors: expect.any(Number),
      });
    });

    it('should limit top countries to 10', async () => {
      const user = await createTestUser();

      // Create visits to 15 different countries
      for (let i = 0; i < 15; i++) {
        const restaurant = await createTestRestaurant({
          country: `Country${i}`,
        });
        await createTestVisit(user.id, restaurant.id);
      }

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body.topCountries.length).toBeLessThanOrEqual(10);
    });

    it('should return zero counts when no data exists', async () => {
      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        totalUsers: 0,
        totalVisits: 0,
        totalRestaurants: 0,
      });
    });

    it('should count unique visitors per country correctly', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const restaurant1 = await createTestRestaurant({ country: 'France' });
      const restaurant2 = await createTestRestaurant({ country: 'France' });

      await createTestVisit(user1.id, restaurant1.id);
      await createTestVisit(user2.id, restaurant2.id);

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      const franceStats = response.body.topCountries.find(
        (c: any) => c.country === 'France'
      );

      expect(franceStats).toBeDefined();
      expect(franceStats.unique_visitors).toBe(2);
      expect(franceStats.total_visits).toBe(2);
    });

    it('should order top countries by unique visitors', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // France: 2 visitors
      const france1 = await createTestRestaurant({ country: 'France' });
      const france2 = await createTestRestaurant({ country: 'France' });
      await createTestVisit(user1.id, france1.id);
      await createTestVisit(user2.id, france2.id);

      // Italy: 1 visitor
      const italy = await createTestRestaurant({ country: 'Italy' });
      await createTestVisit(user1.id, italy.id);

      const response = await request(app)
        .get('/api/leaderboard/stats')
        .expect(200);

      // France should be first (2 unique visitors)
      expect(response.body.topCountries[0].country).toBe('France');
      expect(response.body.topCountries[1].country).toBe('Italy');
    });
  });
});
