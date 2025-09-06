import { Request, Response } from 'express';
import { errorHandler } from './errorHandler';
import { ValidationError } from '../types/errors';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  // mockNext not used in current tests

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should handle basic errors with 500 status', () => {
    const error = new Error('Test error');

    errorHandler(error, mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Something went wrong',
      timestamp: expect.any(String),
      path: '/test',
      method: 'GET',
    });
  });

  it('should handle validation errors with 400 status', () => {
    const validationError = new ValidationError('Invalid input data');

    errorHandler(validationError, mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid input data',
      timestamp: expect.any(String),
      path: '/test',
      method: 'GET',
    });
  });
});
