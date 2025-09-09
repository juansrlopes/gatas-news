/**
 * CRITICAL: Celebrity Data Protection Middleware
 *
 * This middleware prevents accidental deletion of celebrity data
 * which is the foundation of our entire business.
 */

import { Request, Response, NextFunction } from 'express';
import { Celebrity } from '../database/models/Celebrity';
import logger from '../utils/logger';

/**
 * Middleware to protect against celebrity data loss
 */
export const celebrityProtectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check celebrity count before any potentially destructive operation
    const celebrityCount = await Celebrity.countDocuments();

    if (celebrityCount === 0) {
      logger.error('🚨 CRITICAL: NO CELEBRITIES FOUND IN DATABASE!');
      logger.error(
        '🚨 This is a business-critical error. The application cannot function without celebrities.'
      );

      res.status(500).json({
        success: false,
        error: 'CRITICAL_ERROR',
        message: 'No celebrities found in database. This is a business-critical error.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (celebrityCount < 50) {
      logger.warn(`⚠️ WARNING: Only ${celebrityCount} celebrities in database. Expected 100+`);
      logger.warn('⚠️ This may indicate data loss. Please verify celebrity data integrity.');
    }

    // Add celebrity count to request for monitoring
    (req as Request & { celebrityCount?: number }).celebrityCount = celebrityCount;
    next();
  } catch (error) {
    logger.error('Error in celebrity protection middleware:', error);
    res.status(500).json({
      success: false,
      error: 'MIDDLEWARE_ERROR',
      message: 'Failed to verify celebrity data integrity',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Startup validation to ensure celebrities exist
 */
export const validateCelebritiesOnStartup = async (): Promise<void> => {
  try {
    const celebrityCount = await Celebrity.countDocuments();

    if (celebrityCount === 0) {
      logger.error('🚨 FATAL: NO CELEBRITIES IN DATABASE ON STARTUP!');
      logger.error('🚨 The application cannot start without celebrities.');
      logger.error('🚨 Run: npm run migrate:celebrities');
      throw new Error('FATAL_ERROR: No celebrities in database. Run migration first.');
    }

    if (celebrityCount < 50) {
      logger.warn(`⚠️ STARTUP WARNING: Only ${celebrityCount} celebrities found. Expected 100+`);
      logger.warn('⚠️ Consider running: npm run migrate:celebrities');
    } else {
      logger.info(`✅ Celebrity validation passed: ${celebrityCount} celebrities found`);
    }
  } catch (error) {
    logger.error('🚨 FATAL: Celebrity validation failed on startup:', error);
    throw error;
  }
};
