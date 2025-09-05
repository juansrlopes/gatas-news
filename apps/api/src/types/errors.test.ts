import {
  APIError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ExternalAPIError,
} from './errors';

describe('API Error Classes', () => {
  describe('APIError', () => {
    it('should create error with default values', () => {
      const error = new APIError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with custom status code', () => {
      const error = new APIError('Custom error', 400);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error).toBeInstanceOf(APIError);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error).toBeInstanceOf(APIError);
    });

    it('should use default message when none provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });
  });
});
