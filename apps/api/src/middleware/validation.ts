import { query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors';

// Validation middleware to handle validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map(error => error.msg)
      .join(', ');
    throw new ValidationError(`Validation failed: ${errorMessages}`);
  }
  next();
};

// News endpoint validation rules
export const validateNewsRequest = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be a positive integer between 1 and 100'),

  query('celebrity')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape()
    .withMessage('Celebrity name must be between 2 and 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('sortBy')
    .optional()
    .isIn(['publishedAt', 'relevancy', 'popularity'])
    .withMessage('SortBy must be one of: publishedAt, relevancy, popularity'),

  query('searchTerm')
    .optional()
    .isString()
    .isLength({ min: 2, max: 200 })
    .trim()
    .escape()
    .withMessage('Search term must be between 2 and 200 characters'),

  query('sentiment')
    .optional()
    .isIn(['positive', 'negative', 'neutral'])
    .withMessage('Sentiment must be one of: positive, negative, neutral'),

  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO 8601 date'),

  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO 8601 date'),

  handleValidationErrors,
];

// Health check validation (minimal)
export const validateHealthCheck = [
  // No specific validation needed for health check
  handleValidationErrors,
];
