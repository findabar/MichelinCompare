import request from 'supertest';
import { createTestApp } from './utils/testApp';
import {
  createTestUser,
  createTestRestaurant,
  getAuthHeader,
} from './utils/testHelpers';
import nock from 'nock';

const app = createTestApp();

describe('Scraper Routes', () => {
  describe('GET /api/scraper/preview-update/:id', () => {
    const scraperServiceUrl = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3002';

    beforeEach(() => {
      // Clear any existing nock interceptors
      nock.cleanAll();
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it('should allow admin user to get preview-update', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Test Restaurant',
        michelinGuideUrl: 'https://guide.michelin.com/en/test-restaurant',
        michelinStars: 2,
        description: 'Old description',
      });

      // Mock the scraper service response
      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [
              {
                name: 'Test Restaurant',
                michelinStars: 3,
                description: 'New description',
                address: '123 Main St',
                city: 'Paris',
                country: 'France',
                url: restaurant.michelinUrl,
              },
            ],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('current');
      expect(response.body.comparison).toHaveProperty('scraped');
      expect(response.body.comparison).toHaveProperty('differences');
      expect(response.body.comparison.differences).toContain('michelinStars');
      expect(response.body.comparison.differences).toContain('description');
    });

    it('should reject non-admin user with 403', async () => {
      const user = await createTestUser({ admin: false });
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(user.token))
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Admin privileges required');
    });

    it('should reject unauthenticated request with 401', async () => {
      const restaurant = await createTestRestaurant();

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should detect description changes correctly', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Description Test',
        michelinGuideUrl: 'https://guide.michelin.com/en/description-test',
        description: 'Original description text',
      });

      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [
              {
                name: 'Description Test',
                michelinStars: restaurant.michelinStars,
                description: 'Updated description text',
                address: restaurant.address,
                city: restaurant.city,
                country: restaurant.country,
                url: restaurant.michelinUrl,
              },
            ],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.comparison.differences).toContain('description');
      expect(response.body.comparison.current.description).toBe('Original description text');
      expect(response.body.comparison.scraped.description).toBe('Updated description text');
    });

    it('should detect lost stars and set warning flag', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Lost Stars Test',
        michelinGuideUrl: 'https://guide.michelin.com/en/lost-stars',
        michelinStars: 3,
      });

      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [
              {
                name: 'Lost Stars Test',
                michelinStars: 2,
                description: restaurant.description,
                address: restaurant.address,
                city: restaurant.city,
                country: restaurant.country,
                url: restaurant.michelinUrl,
              },
            ],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.comparison.differences).toContain('michelinStars');
      expect(response.body.comparison.lostStars).toBe(true);
      expect(response.body.comparison.current.michelinStars).toBe(3);
      expect(response.body.comparison.scraped.michelinStars).toBe(2);
    });

    it('should return 404 for non-existent restaurant', async () => {
      const admin = await createTestUser({ admin: true });

      const response = await request(app)
        .get('/api/scraper/preview-update/non-existent-id')
        .set(getAuthHeader(admin.token))
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should handle scraper service unavailability', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        michelinGuideUrl: 'https://guide.michelin.com/en/unavailable',
      });

      // Mock scraper service to return error
      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(500, {
          success: false,
          message: 'Scraper service error',
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle restaurant not found in scraped data', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Not Found Restaurant',
        michelinGuideUrl: 'https://guide.michelin.com/en/not-found',
      });

      // Mock scraper to return empty results
      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found in scraped data');
    });

    it('should not include description in differences if unchanged', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Same Description',
        michelinGuideUrl: 'https://guide.michelin.com/en/same-description',
        description: 'Unchanged description',
        michelinStars: 2,
      });

      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [
              {
                name: 'Same Description',
                michelinStars: 3, // Changed
                description: 'Unchanged description', // Same
                address: restaurant.address,
                city: restaurant.city,
                country: restaurant.country,
                url: restaurant.michelinUrl,
              },
            ],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.comparison.differences).toContain('michelinStars');
      expect(response.body.comparison.differences).not.toContain('description');
    });

    it('should handle null descriptions correctly', async () => {
      const admin = await createTestUser({ admin: true });
      const restaurant = await createTestRestaurant({
        name: 'Null Description',
        michelinGuideUrl: 'https://guide.michelin.com/en/null-description',
      });

      nock(scraperServiceUrl)
        .post('/test-restaurant', { restaurantName: restaurant.name })
        .reply(200, {
          result: {
            restaurants: [
              {
                name: 'Null Description',
                michelinStars: restaurant.michelinStars,
                description: 'New description added',
                address: restaurant.address,
                city: restaurant.city,
                country: restaurant.country,
                url: restaurant.michelinUrl,
              },
            ],
          },
        });

      const response = await request(app)
        .get(`/api/scraper/preview-update/${restaurant.id}`)
        .set(getAuthHeader(admin.token))
        .expect(200);

      expect(response.body.comparison.differences).toContain('description');
      expect(response.body.comparison.current.description).toBeNull();
      expect(response.body.comparison.scraped.description).toBe('New description added');
    });
  });
});
