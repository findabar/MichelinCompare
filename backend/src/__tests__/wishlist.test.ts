import request from 'supertest';
import { createTestApp } from './utils/testApp';
import {
  createTestUser,
  createTestRestaurant,
  cleanupTestData,
  getAuthHeader,
  TestUser,
  TestRestaurant,
} from './utils/testHelpers';
import { prisma } from '../utils/prisma';

const app = createTestApp();

describe('Wishlist Routes', () => {
  let user: TestUser;
  let user2: TestUser;
  let restaurant1: TestRestaurant;
  let restaurant2: TestRestaurant;

  beforeEach(async () => {
    await cleanupTestData();
    user = await createTestUser({ username: 'wishlistuser1' });
    user2 = await createTestUser({ username: 'wishlistuser2' });
    restaurant1 = await createTestRestaurant({
      name: 'Test Restaurant 1',
      michelinStars: 3,
      city: 'Paris',
      country: 'France',
    });
    restaurant2 = await createTestRestaurant({
      name: 'Test Restaurant 2',
      michelinStars: 2,
      city: 'Tokyo',
      country: 'Japan',
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('POST /api/wishlist', () => {
    it('should add a restaurant to wishlist successfully', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist).toMatchObject({
        userId: user.id,
        restaurantId: restaurant1.id,
      });
    });

    it('should add a restaurant to wishlist with a note', async () => {
      const note = 'Planning to visit for anniversary';
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.note).toBe(note);
    });

    it('should reject adding wishlist without authentication', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .send({
          restaurantId: restaurant1.id,
        });

      expect(response.status).toBe(401);
    });

    it('should reject adding wishlist without restaurant ID', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject adding non-existent restaurant to wishlist', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: 'nonexistent',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject adding duplicate restaurant to wishlist', async () => {
      // Add first time
      await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({ restaurantId: restaurant1.id });

      // Try to add again
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({ restaurantId: restaurant1.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already in wishlist');
    });

    it('should handle notes with special characters', async () => {
      const note = 'Special occasion! 🎉 @anniversary #2025 "best" \'place\'';
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.wishlist.note).toBe(note);
    });

    it('should trim whitespace from notes', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note: '   trip to Paris   ',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.wishlist.note).toBe('trip to Paris');
    });

    it('should handle very long notes', async () => {
      const longNote = 'a'.repeat(1000);
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note: longNote,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.wishlist.note).toBe(longNote);
    });
  });

  describe('GET /api/wishlist', () => {
    beforeEach(async () => {
      // Add restaurants to wishlist with explicit timestamps to ensure ordering
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          restaurantId: restaurant1.id,
          note: 'First wishlist item',
          createdAt: new Date(Date.now() - 1000), // 1 second ago
        },
      });
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          restaurantId: restaurant2.id,
          note: 'Second wishlist item',
          createdAt: new Date(), // Now
        },
      });
    });

    it('should return user wishlist successfully', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlists).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should include restaurant details in wishlist', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      const wishlists = response.body.data.wishlists;
      expect(wishlists[0].restaurant).toMatchObject({
        name: expect.any(String),
        city: expect.any(String),
        country: expect.any(String),
        michelinStars: expect.any(Number),
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/wishlist?page=1&limit=1')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.wishlists).toHaveLength(1);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should order wishlists by creation date descending', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      const wishlists = response.body.data.wishlists;
      expect(wishlists[0].restaurant.name).toBe('Test Restaurant 2');
      expect(wishlists[1].restaurant.name).toBe('Test Restaurant 1');
    });

    it('should return only authenticated user wishlist', async () => {
      // Create wishlist for user2
      await prisma.wishlist.create({
        data: {
          userId: user2.id,
          restaurantId: restaurant1.id,
        },
      });

      const response = await request(app)
        .get('/api/wishlist')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.wishlists).toHaveLength(2);
      response.body.data.wishlists.forEach((w: any) => {
        expect(w.userId).toBe(user.id);
      });
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get('/api/wishlist');

      expect(response.status).toBe(401);
    });

    it('should return empty array for user with no wishlist', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set(getAuthHeader(user2.token));

      expect(response.status).toBe(200);
      expect(response.body.data.wishlists).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should handle invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/wishlist?page=0')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBeGreaterThanOrEqual(1);
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/wishlist?limit=-1')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.wishlists.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/wishlist/check/:restaurantId', () => {
    beforeEach(async () => {
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          restaurantId: restaurant1.id,
          note: 'Test note',
        },
      });
    });

    it('should return true if restaurant is in wishlist', async () => {
      const response = await request(app)
        .get(`/api/wishlist/check/${restaurant1.id}`)
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inWishlist).toBe(true);
      expect(response.body.data.wishlist).toBeDefined();
      expect(response.body.data.wishlist.note).toBe('Test note');
    });

    it('should return false if restaurant is not in wishlist', async () => {
      const response = await request(app)
        .get(`/api/wishlist/check/${restaurant2.id}`)
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inWishlist).toBe(false);
      expect(response.body.data.wishlist).toBeNull();
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).get(
        `/api/wishlist/check/${restaurant1.id}`
      );

      expect(response.status).toBe(401);
    });

    it('should handle non-existent restaurant', async () => {
      const response = await request(app)
        .get('/api/wishlist/check/nonexistent')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.inWishlist).toBe(false);
    });
  });

  describe('PATCH /api/wishlist/:restaurantId', () => {
    beforeEach(async () => {
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          restaurantId: restaurant1.id,
          note: 'Original note',
        },
      });
    });

    it('should update wishlist note successfully', async () => {
      const newNote = 'Updated note';
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token))
        .send({ note: newNote });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.note).toBe(newNote);
    });

    it('should allow clearing the note', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token))
        .send({ note: '' });

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.note).toBe('');
    });

    it('should reject updating non-existent wishlist', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant2.id}`)
        .set(getAuthHeader(user.token))
        .send({ note: 'New note' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject updating another user wishlist', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user2.token))
        .send({ note: 'Hacked note' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .send({ note: 'New note' });

      expect(response.status).toBe(401);
    });

    it('should handle missing note in request body', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should trim whitespace from updated notes', async () => {
      const response = await request(app)
        .patch(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token))
        .send({ note: '  Updated with spaces  ' });

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.note).toBe('Updated with spaces');
    });
  });

  describe('DELETE /api/wishlist/:restaurantId', () => {
    beforeEach(async () => {
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          restaurantId: restaurant1.id,
          note: 'To be deleted',
        },
      });
    });

    it('should delete wishlist item successfully', async () => {
      const response = await request(app)
        .delete(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('removed');

      // Verify deletion
      const wishlist = await prisma.wishlist.findFirst({
        where: { userId: user.id, restaurantId: restaurant1.id },
      });
      expect(wishlist).toBeNull();
    });

    it('should reject deleting non-existent wishlist', async () => {
      const response = await request(app)
        .delete(`/api/wishlist/${restaurant2.id}`)
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject deleting another user wishlist', async () => {
      const response = await request(app)
        .delete(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user2.token));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).delete(
        `/api/wishlist/${restaurant1.id}`
      );

      expect(response.status).toBe(401);
    });

    it('should handle deleting already deleted wishlist', async () => {
      // Delete first time
      await request(app)
        .delete(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token));

      // Try to delete again
      const response = await request(app)
        .delete(`/api/wishlist/${restaurant1.id}`)
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent wishlist additions', async () => {
      const promises = [
        request(app)
          .post('/api/wishlist')
          .set(getAuthHeader(user.token))
          .send({ restaurantId: restaurant1.id }),
        request(app)
          .post('/api/wishlist')
          .set(getAuthHeader(user.token))
          .send({ restaurantId: restaurant1.id }),
      ];

      const responses = await Promise.allSettled(promises);
      const successCount = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201
      ).length;
      const failCount = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 400
      ).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });

    it('should handle large wishlist', async () => {
      // Create 50 restaurants and add to wishlist
      const restaurants = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          createTestRestaurant({ name: `Restaurant ${i}` })
        )
      );

      await Promise.all(
        restaurants.map((r) =>
          prisma.wishlist.create({
            data: { userId: user.id, restaurantId: r.id },
          })
        )
      );

      const response = await request(app)
        .get('/api/wishlist?limit=100')
        .set(getAuthHeader(user.token));

      expect(response.status).toBe(200);
      expect(response.body.data.wishlists).toHaveLength(50);
    });

    it('should handle note with only whitespace', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note: '   ',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.wishlist.note).toBe('');
    });

    it('should preserve note order with newlines', async () => {
      const note = 'Line 1\nLine 2\nLine 3';
      const response = await request(app)
        .post('/api/wishlist')
        .set(getAuthHeader(user.token))
        .send({
          restaurantId: restaurant1.id,
          note,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.wishlist.note).toBe(note);
    });
  });
});
