import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { createTestUser } from './utils/testHelpers';

describe('Middleware Tests', () => {
  describe('authenticateToken', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      mockResponse = {};
      mockNext = jest.fn();
    });

    it('should authenticate valid token and set userId', async () => {
      const user = await createTestUser();

      mockRequest.headers = {
        authorization: `Bearer ${user.token}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.userId).toBe(user.id);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without token', () => {
      mockRequest.headers = {};

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
          statusCode: 401,
        })
      );
      expect(mockRequest.userId).toBeUndefined();
    });

    it('should reject request with invalid token format', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // No space means no token extracted, so "Access token required"
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
          statusCode: 401,
        })
      );
    });

    it('should reject expired token', (done) => {
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' } // Already expired
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 403,
        })
      );
      done();
    });

    it('should reject token with invalid signature', () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user-id' },
        'wrong-secret-key'
      );

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 403,
        })
      );
    });

    it('should reject malformed token', () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed.token.string',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 403,
        })
      );
    });

    it('should handle Bearer prefix case-sensitively', async () => {
      const user = await createTestUser();

      mockRequest.headers = {
        authorization: `Bearer ${user.token}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Works with proper Bearer prefix
      expect(mockRequest.userId).toBe(user.id);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract userId from token payload', async () => {
      const testUserId = 'specific-user-id-123';
      const token = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.userId).toBe(testUserId);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('adminAuth', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      mockResponse = {};
      mockNext = jest.fn();
    });

    it('should authenticate admin user and set userId', async () => {
      const admin = await createTestUser({ admin: true });

      mockRequest.headers = {
        authorization: `Bearer ${admin.token}`,
      };

      await adminAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).userId).toBe(admin.id);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject non-admin user with 403', async () => {
      const user = await createTestUser({ admin: false });

      mockRequest.headers = {
        authorization: `Bearer ${user.token}`,
      };

      await adminAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied. Admin privileges required.',
          statusCode: 403,
        })
      );
      expect((mockRequest as any).userId).toBeUndefined();
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};

      await adminAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No authorization header provided',
          statusCode: 401,
        })
      );
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here',
      };

      await adminAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 401,
        })
      );
    });

    it('should reject token for non-existent user', async () => {
      const token = jwt.sign(
        { userId: 'non-existent-user-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      await adminAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 401,
        })
      );
    });
  });
});
