import request from 'supertest';
import { createTestApp } from './utils/testApp';
import { createTestRestaurant, createTestUser, createTestVisit, getAuthHeader } from './utils/testHelpers';

const app = createTestApp();

describe('Restaurant Routes', () => {
  describe('GET /api/restaurants', () => {
    it('should return paginated list of restaurants', async () => {
      await createTestRestaurant({ name: 'Restaurant A', michelinStars: 3 });
      await createTestRestaurant({ name: 'Restaurant B', michelinStars: 1 });

      const response = await request(app)
        .get('/api/restaurants')
        .expect(200);

      expect(response.body).toHaveProperty('restaurants');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.restaurants)).toBe(true);
      expect(response.body.restaurants.length).toBeGreaterThan(0);
      expect(response.body.pagination).toMatchObject({
        current: 1,
        total: expect.any(Number),
        count: expect.any(Number),
        totalCount: expect.any(Number),
      });
    });

    it('should filter restaurants by Michelin stars', async () => {
      await createTestRestaurant({ name: '3-Star Restaurant', michelinStars: 3 });
      await createTestRestaurant({ name: '1-Star Restaurant', michelinStars: 1 });

      const response = await request(app)
        .get('/api/restaurants')
        .query({ michelinStars: 3 })
        .expect(200);

      expect(response.body.restaurants).toHaveLength(1);
      expect(response.body.restaurants[0].name).toBe('3-Star Restaurant');
      expect(response.body.restaurants[0].michelinStars).toBe(3);
    });

    it('should filter restaurants by country', async () => {
      await createTestRestaurant({ name: 'French Restaurant', country: 'France' });
      await createTestRestaurant({ name: 'Italian Restaurant', country: 'Italy' });

      const response = await request(app)
        .get('/api/restaurants')
        .query({ country: 'France' })
        .expect(200);

      expect(response.body.restaurants).toHaveLength(1);
      expect(response.body.restaurants[0].country).toContain('France');
    });

    it('should filter restaurants by city', async () => {
      await createTestRestaurant({ name: 'Paris Restaurant', city: 'Paris' });
      await createTestRestaurant({ name: 'Lyon Restaurant', city: 'Lyon' });

      const response = await request(app)
        .get('/api/restaurants')
        .query({ city: 'Paris' })
        .expect(200);

      expect(response.body.restaurants).toHaveLength(1);
      expect(response.body.restaurants[0].city).toContain('Paris');
    });

    it('should filter restaurants by cuisine type', async () => {
      await createTestRestaurant({ name: 'French Place', cuisineType: 'French' });
      await createTestRestaurant({ name: 'Japanese Place', cuisineType: 'Japanese' });

      const response = await request(app)
        .get('/api/restaurants')
        .query({ cuisineType: 'Japanese' })
        .expect(200);

      expect(response.body.restaurants).toHaveLength(1);
      expect(response.body.restaurants[0].cuisineType).toContain('Japanese');
    });

    it('should search restaurants by name', async () => {
      await createTestRestaurant({ name: 'Le Grand Restaurant' });
      await createTestRestaurant({ name: 'Sushi Bar' });

      const response = await request(app)
        .get('/api/restaurants')
        .query({ search: 'Grand' })
        .expect(200);

      expect(response.body.restaurants).toHaveLength(1);
      expect(response.body.restaurants[0].name).toContain('Grand');
    });

    it('should support pagination', async () => {
      // Create 5 restaurants
      for (let i = 1; i <= 5; i++) {
        await createTestRestaurant({ name: `Restaurant ${i}` });
      }

      const page1 = await request(app)
        .get('/api/restaurants')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1.body.restaurants).toHaveLength(2);
      expect(page1.body.pagination.current).toBe(1);

      const page2 = await request(app)
        .get('/api/restaurants')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.restaurants).toHaveLength(2);
      expect(page2.body.pagination.current).toBe(2);
    });

    it('should order restaurants by stars desc then name asc', async () => {
      await createTestRestaurant({ name: 'C Restaurant', michelinStars: 1 });
      await createTestRestaurant({ name: 'A Restaurant', michelinStars: 3 });
      await createTestRestaurant({ name: 'B Restaurant', michelinStars: 3 });

      const response = await request(app)
        .get('/api/restaurants')
        .expect(200);

      const names = response.body.restaurants.map((r: any) => r.name);
      expect(names[0]).toBe('A Restaurant'); // 3 stars, A comes first
      expect(names[1]).toBe('B Restaurant'); // 3 stars, B comes second
    });
  });

  describe('GET /api/restaurants/filters', () => {
    it('should return available filter options', async () => {
      await createTestRestaurant({
        country: 'France',
        city: 'Paris',
        cuisineType: 'French',
      });
      await createTestRestaurant({
        country: 'Italy',
        city: 'Rome',
        cuisineType: 'Italian',
      });

      const response = await request(app)
        .get('/api/restaurants/filters')
        .expect(200);

      expect(response.body).toHaveProperty('countries');
      expect(response.body).toHaveProperty('cities');
      expect(response.body).toHaveProperty('cuisineTypes');
      expect(Array.isArray(response.body.countries)).toBe(true);
      expect(response.body.countries.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/restaurants/:id', () => {
    it('should return restaurant details by id', async () => {
      const restaurant = await createTestRestaurant({
        name: 'Test Restaurant',
        city: 'Paris',
        country: 'France',
        michelinStars: 2,
      });

      const response = await request(app)
        .get(`/api/restaurants/${restaurant.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurant.id,
        name: 'Test Restaurant',
        city: 'Paris',
        country: 'France',
        michelinStars: 2,
      });
      expect(response.body).toHaveProperty('visits');
    });

    it('should include recent visits with restaurant details', async () => {
      const user = await createTestUser();
      const restaurant = await createTestRestaurant();
      await createTestVisit(user.id, restaurant.id, {
        notes: 'Great meal!',
      });

      const response = await request(app)
        .get(`/api/restaurants/${restaurant.id}`)
        .expect(200);

      expect(response.body.visits).toHaveLength(1);
      expect(response.body.visits[0]).toHaveProperty('user');
      expect(response.body.visits[0].user.username).toBe(user.username);
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .get('/api/restaurants/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/restaurants/:id', () => {
    it('should update restaurant details with admin authentication', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Original Name',
        city: 'Paris',
      });

      const response = await request(app)
        .put(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .send({
          name: 'Updated Name',
          city: 'Lyon',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.restaurant.name).toBe('Updated Name');
      expect(response.body.restaurant.city).toBe('Lyon');
    });

    it('should return 403 when non-admin user tries to update', async () => {
      const user = await createTestUser({ admin: false });
      const restaurant = await createTestRestaurant({
        name: 'Original Name',
      });

      const response = await request(app)
        .put(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(user.token))
        .send({ name: 'New Name' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin privileges required');
    });

    it('should return 401 when updating without authentication', async () => {
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .put(`/api/restaurants/${restaurant.id}`)
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when updating non-existent restaurant', async () => {
      const admin = await createTestUser({ admin: true });

      const response = await request(app)
        .put('/api/restaurants/non-existent-id')
        .set(getAuthHeader(admin.token))
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should partially update restaurant fields', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Original Name',
        description: 'Original description',
      });

      const response = await request(app)
        .put(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .send({
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.restaurant.name).toBe('Original Name');
      expect(response.body.restaurant.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/restaurants/:id', () => {
    it('should delete restaurant and its visits with admin authentication', async () => {
      const admin = await createTestUser({ admin: true });
      const user = await createTestUser();
      const restaurant = await createTestRestaurant({ name: 'To Delete' });
      await createTestVisit(user.id, restaurant.id);

      const response = await request(app)
        .delete(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedVisits).toBe(1);
      expect(response.body.message).toContain('To Delete');

      // Verify restaurant is deleted
      const checkResponse = await request(app)
        .get(`/api/restaurants/${restaurant.id}`)
        .expect(404);
    });

    it('should return 403 when non-admin user tries to delete', async () => {
      const user = await createTestUser({ admin: false });
      const restaurant = await createTestRestaurant({ name: 'To Delete' });

      const response = await request(app)
        .delete(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(user.token))
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin privileges required');
    });

    it('should return 401 when deleting without authentication', async () => {
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .delete(`/api/restaurants/${restaurant.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when deleting non-existent restaurant', async () => {
      const admin = await createTestUser({ admin: true });

      const response = await request(app)
        .delete('/api/restaurants/non-existent-id')
        .set(getAuthHeader(admin.token))
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should delete restaurant with no visits', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .delete(`/api/restaurants/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedVisits).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    describe('Very Long Descriptions', () => {
      it('should handle extremely long descriptions', async () => {
        const longDescription = 'A'.repeat(5000); // 5000 character description
        const restaurant = await createTestRestaurant({
          name: 'Long Description Restaurant',
          description: longDescription,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.description).toBe(longDescription);
        expect(response.body.description.length).toBe(5000);
      });

      it('should update restaurant with very long description', async () => {
        const admin = await createTestUser({ admin: true });
        const restaurant = await createTestRestaurant({
          name: 'Test Restaurant',
        });

        const longDescription = 'B'.repeat(10000);

        const response = await request(app)
          .put(`/api/restaurants/${restaurant.id}`)
          .set(getAuthHeader(admin.token))
          .send({ description: longDescription })
          .expect(200);

        expect(response.body.restaurant.description).toBe(longDescription);
      });
    });

    describe('Invalid Michelin URLs', () => {
      it('should accept restaurant with invalid URL format', async () => {
        // System doesn't validate URLs at creation, only during scraping
        const restaurant = await createTestRestaurant({
          name: 'Invalid URL Restaurant',
          michelinGuideUrl: 'not-a-valid-url',
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.michelinGuideUrl).toBe('not-a-valid-url');
      });

      it('should accept restaurant with empty URL', async () => {
        const restaurant = await createTestRestaurant({
          name: 'No URL Restaurant',
          michelinGuideUrl: '',
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.michelinGuideUrl).toBe('');
      });
    });

    describe('Invalid Star Values', () => {
      it('should handle restaurants with 0 stars', async () => {
        const restaurant = await createTestRestaurant({
          name: 'Zero Stars',
          michelinStars: 0,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.michelinStars).toBe(0);
      });

      it('should filter by 0 stars', async () => {
        await createTestRestaurant({ name: 'Zero Star Place', michelinStars: 0 });
        await createTestRestaurant({ name: 'One Star Place', michelinStars: 1 });

        const response = await request(app)
          .get('/api/restaurants')
          .query({ michelinStars: 0 })
          .expect(200);

        expect(response.body.restaurants.length).toBeGreaterThan(0);
        expect(response.body.restaurants.every((r: any) => r.michelinStars === 0)).toBe(true);
      });
    });

    describe('Special Characters in Names', () => {
      it('should handle restaurant names with special characters', async () => {
        const specialName = "L'Ami Jean & Co. - Paris (1st arr.)";
        const restaurant = await createTestRestaurant({
          name: specialName,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.name).toBe(specialName);
      });

      it('should search for restaurants with special characters', async () => {
        await createTestRestaurant({ name: "L'Auberge" });
        await createTestRestaurant({ name: 'Regular Name' });

        const response = await request(app)
          .get('/api/restaurants')
          .query({ search: "L'Auberge" })
          .expect(200);

        expect(response.body.restaurants).toHaveLength(1);
        expect(response.body.restaurants[0].name).toBe("L'Auberge");
      });

      it('should handle emoji in restaurant names', async () => {
        const emojiName = '🍕 Pizza Place 🍝';
        const restaurant = await createTestRestaurant({
          name: emojiName,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.name).toBe(emojiName);
      });

      it('should handle unicode characters in descriptions', async () => {
        const unicodeDescription = '日本料理 - Cuisine française - 中华料理';
        const restaurant = await createTestRestaurant({
          name: 'Unicode Test',
          description: unicodeDescription,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.description).toBe(unicodeDescription);
      });
    });

    describe('Null and Empty Values', () => {
      it('should handle null description', async () => {
        const restaurant = await createTestRestaurant({
          name: 'No Description',
          description: null,
        });

        const response = await request(app)
          .get(`/api/restaurants/${restaurant.id}`)
          .expect(200);

        expect(response.body.description).toBeNull();
      });

      it('should update description to null', async () => {
        const admin = await createTestUser({ admin: true });
        const restaurant = await createTestRestaurant({
          name: 'Has Description',
          description: 'Original description',
        });

        const response = await request(app)
          .put(`/api/restaurants/${restaurant.id}`)
          .set(getAuthHeader(admin.token))
          .send({ description: null })
          .expect(200);

        expect(response.body.restaurant.description).toBeNull();
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple simultaneous reads', async () => {
        const restaurant = await createTestRestaurant({ name: 'Concurrent Test' });

        const requests = Array(10).fill(null).map(() =>
          request(app).get(`/api/restaurants/${restaurant.id}`)
        );

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body.name).toBe('Concurrent Test');
        });
      });
    });
  });
});
