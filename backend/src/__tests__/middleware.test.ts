import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';
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

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 403,
        })
      );
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      // Wait a moment for token to expire
      setTimeout(() => {
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
      }, 100);
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

    it('should handle Bearer prefix case-insensitively', async () => {
      const user = await createTestUser();

      mockRequest.headers = {
        authorization: `bearer ${user.token}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Should still work with lowercase 'bearer'
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
});
