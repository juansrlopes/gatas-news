import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors';

/**
 * Validation middleware for pagination parameters
 */
export const validatePagination = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit } = req.query;

  // Validate page parameter
  if (page !== undefined) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Page must be a positive integer');
    }
    if (pageNum > 1000) {
      throw new ValidationError('Page number cannot exceed 1000');
    }
  }

  // Validate limit parameter
  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      throw new ValidationError('Limit must be a positive integer');
    }
    if (limitNum > 100) {
      throw new ValidationError('Limit cannot exceed 100 items per page');
    }
  }

  next();
};

/**
 * Validation middleware for date parameters
 */
export const validateDateRange = (req: Request, _res: Response, next: NextFunction): void => {
  const { dateFrom, dateTo } = req.query;

  if (dateFrom) {
    const fromDate = new Date(dateFrom as string);
    if (isNaN(fromDate.getTime())) {
      throw new ValidationError('dateFrom must be a valid date');
    }

    // Don't allow dates too far in the past (more than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (fromDate < twoYearsAgo) {
      throw new ValidationError('dateFrom cannot be more than 2 years in the past');
    }
  }

  if (dateTo) {
    const toDate = new Date(dateTo as string);
    if (isNaN(toDate.getTime())) {
      throw new ValidationError('dateTo must be a valid date');
    }

    // Don't allow future dates
    if (toDate > new Date()) {
      throw new ValidationError('dateTo cannot be in the future');
    }
  }

  // Validate date range
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom as string);
    const toDate = new Date(dateTo as string);

    if (fromDate >= toDate) {
      throw new ValidationError('dateFrom must be before dateTo');
    }

    // Don't allow ranges longer than 1 year
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > oneYearInMs) {
      throw new ValidationError('Date range cannot exceed 1 year');
    }
  }

  next();
};

/**
 * Validation middleware for search parameters
 */
export const validateSearch = (req: Request, _res: Response, next: NextFunction): void => {
  const { q, searchTerm } = req.query;
  const query = q || searchTerm;

  if (query !== undefined) {
    if (typeof query !== 'string') {
      throw new ValidationError('Search query must be a string');
    }

    if (query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    if (query.length > 100) {
      throw new ValidationError('Search query cannot exceed 100 characters');
    }

    // Basic sanitization - no special regex characters that could cause issues
    const dangerousChars = /[<>{}[\]\\]/;
    if (dangerousChars.test(query)) {
      throw new ValidationError('Search query contains invalid characters');
    }
  }

  next();
};

/**
 * Validation middleware for sorting parameters
 */
export const validateSorting = (allowedFields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { sortBy, sortOrder } = req.query;

    if (sortBy !== undefined) {
      if (typeof sortBy !== 'string' || !allowedFields.includes(sortBy)) {
        throw new ValidationError(`sortBy must be one of: ${allowedFields.join(', ')}`);
      }
    }

    if (sortOrder !== undefined) {
      if (typeof sortOrder !== 'string' || !['asc', 'desc'].includes(sortOrder)) {
        throw new ValidationError('sortOrder must be either "asc" or "desc"');
      }
    }

    next();
  };
};

/**
 * Validation middleware for celebrity names
 */
export const validateCelebrityName = (req: Request, _res: Response, next: NextFunction): void => {
  const { celebrity } = req.query;

  if (celebrity !== undefined) {
    if (typeof celebrity !== 'string') {
      throw new ValidationError('Celebrity name must be a string');
    }

    if (celebrity.length < 2) {
      throw new ValidationError('Celebrity name must be at least 2 characters long');
    }

    if (celebrity.length > 50) {
      throw new ValidationError('Celebrity name cannot exceed 50 characters');
    }
  }

  next();
};

/**
 * Validation middleware for sentiment parameter
 */
export const validateSentiment = (req: Request, _res: Response, next: NextFunction): void => {
  const { sentiment } = req.query;

  if (sentiment !== undefined) {
    const validSentiments = ['positive', 'negative', 'neutral'];
    if (typeof sentiment !== 'string' || !validSentiments.includes(sentiment)) {
      throw new ValidationError(`sentiment must be one of: ${validSentiments.join(', ')}`);
    }
  }

  next();
};
