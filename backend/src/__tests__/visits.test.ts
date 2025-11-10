import request from 'supertest';
import { createTestApp } from './utils/testApp';
import {
  createTestUser,
  createTestRestaurant,
  createTestVisit,
  getAuthHeader,
} from './utils/testHelpers';
import { prisma } from '../utils/prisma';

const app = createTestApp();

describe('Visit Routes', () => {
  describe('POST /api/visits', () => {
    it('should record a new visit successfully', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant({ michelinStars: 2 });

      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
          notes: 'Amazing experience!',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Visit recorded successfully');
      expect(response.body).toHaveProperty('pointsEarned', 2);
      expect(response.body.visit).toMatchObject({
        userId: user.id,
        restaurantId: restaurant.id,
        notes: 'Amazing experience!',
      });
    });

    it('should update user score when recording visit', async () => {
      const user = await createTestUser({ totalScore: 0 });
      const restaurant = await createTestRestaurant({ michelinStars: 3 });

      await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
        })
        .expect(201);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.totalScore).toBe(3);
      expect(updatedUser?.restaurantsVisitedCount).toBe(1);
    });

    it('should reject visit without authentication', async () => {
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .post('/api/visits')
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate visit to same restaurant', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();

      // First visit
      await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
        })
        .expect(201);

      // Try to visit again
      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
        })
        .expect(409);

      expect(response.body.error).toContain('already visited');
    });

    it('should reject visit to non-existent restaurant', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: 'non-existent-id',
          dateVisited: new Date().toISOString(),
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should allow visit without notes', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body.visit.notes).toBeNull();
    });

    it('should reject visit with invalid date format', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant.id,
          dateVisited: 'invalid-date',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject visit with missing restaurant ID', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/visits')
        .set(getAuthHeader(user.token))
        .send({
          dateVisited: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/visits', () => {
    it('should return user visits', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ name: 'Restaurant 1' });
      const restaurant2 = await createTestRestaurant({ name: 'Restaurant 2' });

      await createTestVisit(user.id, restaurant1.id);
      await createTestVisit(user.id, restaurant2.id);

      const response = await request(app)
        .get('/api/visits')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body).toHaveProperty('visits');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.visits).toHaveLength(2);
      expect(response.body.visits[0]).toHaveProperty('restaurant');
    });

    it('should return only authenticated user visits', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const restaurant = await createTestRestaurant();

      await createTestVisit(user1.id, restaurant.id);
      await createTestVisit(user2.id, restaurant.id);

      const response = await request(app)
        .get('/api/visits')
        .set(getAuthHeader(user1.token))
        .expect(200);

      expect(response.body.visits).toHaveLength(1);
      expect(response.body.visits[0].userId).toBe(user1.id);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/visits')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should support pagination', async () => {
      const user = await createTestUser();

      // Create 5 visits
      for (let i = 0; i < 5; i++) {
        const restaurant = await createTestRestaurant({ name: `Restaurant ${i}` });
        await createTestVisit(user.id, restaurant.id);
      }

      const page1 = await request(app)
        .get('/api/visits')
        .query({ page: 1, limit: 2 })
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(page1.body.visits).toHaveLength(2);
      expect(page1.body.pagination.current).toBe(1);
      expect(page1.body.pagination.totalCount).toBe(5);

      const page2 = await request(app)
        .get('/api/visits')
        .query({ page: 2, limit: 2 })
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(page2.body.visits).toHaveLength(2);
      expect(page2.body.pagination.current).toBe(2);
    });

    it('should order visits by date descending', async () => {
      const user = await createTestUser();
      const restaurant1 = await createTestRestaurant({ name: 'Old Visit' });
      const restaurant2 = await createTestRestaurant({ name: 'Recent Visit' });

      const oldDate = new Date('2023-01-01');
      const recentDate = new Date('2024-01-01');

      await createTestVisit(user.id, restaurant1.id, { dateVisited: oldDate });
      await createTestVisit(user.id, restaurant2.id, { dateVisited: recentDate });

      const response = await request(app)
        .get('/api/visits')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.visits[0].restaurant.name).toBe('Recent Visit');
      expect(response.body.visits[1].restaurant.name).toBe('Old Visit');
    });

    it('should return empty array for user with no visits', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get('/api/visits')
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body.visits).toHaveLength(0);
      expect(response.body.pagination.totalCount).toBe(0);
    });
  });

  describe('DELETE /api/visits/:id', () => {
    it('should delete own visit successfully', async () => {
      const user = await createTestUser({ totalScore: 2 });
      const restaurant = await createTestRestaurant({ michelinStars: 2 });
      const visit = await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .delete(`/api/visits/${visit.id}`)
        .set(getAuthHeader(user.token))
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Visit deleted successfully');

      // Verify visit is deleted
      const deletedVisit = await prisma.userVisit.findUnique({
        where: { id: visit.id },
      });
      expect(deletedVisit).toBeNull();
    });

    it('should update user score when deleting visit', async () => {
      const user = await createTestUser({ totalScore: 3, restaurantsVisitedCount: 1 });
      const restaurant = await createTestRestaurant({ michelinStars: 3 });
      const visit = await createTestVisit(user.id, restaurant.id);

      await request(app)
        .delete(`/api/visits/${visit.id}`)
        .set(getAuthHeader(user.token))
        .expect(200);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.totalScore).toBe(0);
      expect(updatedUser?.restaurantsVisitedCount).toBe(0);
    });

    it('should reject deleting another user visit', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const restaurant = await createTestRestaurant();
      const visit = await createTestVisit(user2.id, restaurant.id);

      const response = await request(app)
        .delete(`/api/visits/${visit.id}`)
        .set(getAuthHeader(user1.token))
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });

    it('should reject unauthenticated delete request', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();
      const visit = await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .delete(`/api/visits/${visit.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent visit', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .delete('/api/visits/non-existent-id')
        .set(getAuthHeader(user.token))
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });
});
