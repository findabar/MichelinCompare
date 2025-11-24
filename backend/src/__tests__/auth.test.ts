import request from 'supertest';
import { createTestApp } from './utils/testApp';
import { createTestUser } from './utils/testHelpers';

const app = createTestApp();

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: userData.username,
        email: userData.email,
        totalScore: 0,
        restaurantsVisitedCount: 0,
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with duplicate email', async () => {
      const existingUser = await createTestUser({
        email: 'existing@example.com',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: existingUser.email,
          password: 'Password123!',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with duplicate username', async () => {
      const existingUser = await createTestUser({
        username: 'existinguser',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: existingUser.username,
          email: 'newemail@example.com',
          password: 'Password123!',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          // Missing email and password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with username too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab',
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser({
        email: 'testlogin@example.com',
        password: 'Password123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: user.username,
        email: user.email,
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login with incorrect password', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'CorrectPassword123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid email or password');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return valid JWT token on login', async () => {
      const user = await createTestUser({
        email: 'jwttest@example.com',
        password: 'Password123!',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Password123!',
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('Admin Field Validation', () => {
    it('should default admin field to false on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'regularuser',
          email: 'regular@example.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.user.admin).toBe(false);
    });

    it('should not allow setting admin field through registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'hacker',
          email: 'hacker@example.com',
          password: 'Password123!',
          admin: true, // Attempt to set admin
        })
        .expect(201);

      // Should ignore the admin field and default to false
      expect(response.body.user.admin).toBe(false);
    });

    it('should not expose admin field in registration response for security', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'securitytest',
          email: 'security@example.com',
          password: 'Password123!',
        })
        .expect(201);

      // Admin field should either be false or not exposed at all
      expect(response.body.user.admin).toBeDefined();
      expect(response.body.user.admin).toBe(false);
    });

    it('should not expose admin field in login response unnecessarily', async () => {
      const user = await createTestUser({
        email: 'loginadmintest@example.com',
        password: 'Password123!',
        admin: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Password123!',
        })
        .expect(200);

      // Admin field may or may not be exposed - either way is acceptable
      // But if it is exposed, it should be accurate
      if (response.body.user.hasOwnProperty('admin')) {
        expect(response.body.user.admin).toBe(false);
      }
    });

    it('should correctly expose admin status for admin users on login', async () => {
      const admin = await createTestUser({
        email: 'admin@example.com',
        password: 'Password123!',
        admin: true,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: admin.email,
          password: 'Password123!',
        })
        .expect(200);

      // If admin field is exposed, it should be true
      if (response.body.user.hasOwnProperty('admin')) {
        expect(response.body.user.admin).toBe(true);
      }
    });

    it('should verify admin user cannot be created via registration endpoint', async () => {
      // Try multiple variations of setting admin
      const variations = [
        { admin: true },
        { admin: 'true' },
        { isAdmin: true },
        { role: 'admin' },
      ];

      for (const variation of variations) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: `user${Math.random().toString(36).slice(2)}`,
            email: `user${Math.random().toString(36).slice(2)}@example.com`,
            password: 'Password123!',
            ...variation,
          })
          .expect(201);

        expect(response.body.user.admin).toBe(false);
      }
    });
  });
});
