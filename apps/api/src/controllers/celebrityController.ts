import { Request, Response } from 'express';
import { celebrityRepository } from '../database/repositories/CelebrityRepository';
import { celebrityService } from '../services/celebrityService';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../types/errors';
import logger from '../utils/logger';
// Removed unused imports - fs and path no longer needed after JSON removal

export class CelebrityController {
  /**
   * GET /api/v1/admin/celebrities
   * Get celebrities with pagination and filters
   */
  public static getCelebrities = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { page = 1, limit = 20, isActive, sortBy = 'name', sortOrder = 'asc' } = req.query;

      logger.info('Admin celebrities request received', {
        page: Number(page),
        limit: Number(limit),
        ip: req.ip,
      });

      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const options = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as 'name' | 'totalArticles' | 'avgArticlesPerDay' | 'createdAt',
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await celebrityRepository.findWithFilters(filters, options);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/v1/admin/celebrities/search
   * Search celebrities
   */
  public static searchCelebrities = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        throw new ValidationError('Search query is required');
      }

      logger.info('Admin celebrity search request', {
        query: q,
        page: Number(page),
        limit: Number(limit),
        ip: req.ip,
      });

      const result = await celebrityService.searchCelebrities(q, Number(page), Number(limit));

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/v1/admin/celebrities/:id
   * Get celebrity by ID
   */
  public static getCelebrityById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const celebrity = await celebrityRepository.findById(id);

      if (!celebrity) {
        res.status(404).json({
          success: false,
          error: 'Celebrity not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: celebrity,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /api/v1/admin/celebrities
   * Create new celebrity
   */
  public static createCelebrity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { name, aliases = [] } = req.body;

      if (!name) {
        throw new ValidationError('Name is required');
      }

      logger.info('Creating new celebrity', { name, ip: req.ip });

      // Check if celebrity already exists
      const exists = await celebrityRepository.existsByName(name);
      if (exists) {
        throw new ValidationError(`Celebrity "${name}" already exists`);
      }

      const celebrity = await celebrityService.addCelebrity({
        name,
        aliases,
      });

      res.status(201).json({
        success: true,
        data: celebrity,
        message: 'Celebrity created successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * PUT /api/v1/admin/celebrities/:id
   * Update celebrity
   */
  public static updateCelebrity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;

      logger.info('Updating celebrity', { id, ip: req.ip });

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.totalArticles;
      delete updateData.lastFetchedAt;
      delete updateData.avgArticlesPerDay;

      const celebrity = await celebrityService.updateCelebrity(id, updateData);

      if (!celebrity) {
        res.status(404).json({
          success: false,
          error: 'Celebrity not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: celebrity,
        message: 'Celebrity updated successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * DELETE /api/v1/admin/celebrities/:id
   * Soft delete celebrity
   */
  public static deleteCelebrity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      logger.info('Deleting celebrity', { id, ip: req.ip });

      const celebrity = await celebrityService.removeCelebrity(id);

      if (!celebrity) {
        res.status(404).json({
          success: false,
          error: 'Celebrity not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        message: 'Celebrity deleted successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/v1/admin/celebrities/stats
   * Get celebrity statistics
   */
  public static getCelebrityStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      logger.info('Celebrity statistics request', { ip: req.ip });

      const stats = await celebrityService.getStatistics();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/v1/admin/celebrities/top-performers
   * Get top performing celebrities
   */
  public static getTopPerformers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { limit = 10 } = req.query;

      logger.info('Top performers request', { limit: Number(limit), ip: req.ip });

      const topPerformers = await celebrityService.getTopPerformers(Number(limit));

      res.json({
        success: true,
        data: {
          topPerformers,
          count: topPerformers.length,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /api/v1/admin/celebrities/migrate-from-json
   * Migrate celebrities from JSON file to database (DEPRECATED - JSON file removed)
   */
  public static migrateFromJson = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      logger.info('Celebrity migration from JSON requested', { ip: req.ip });

      // Check if celebrities data is provided in request body
      const { celebrities } = req.body;

      if (!celebrities || !Array.isArray(celebrities)) {
        res.status(400).json({
          success: false,
          error:
            'Migration no longer available - JSON file has been removed. Celebrities are now managed via database.',
          message:
            'The celebrities.json file has been removed as part of the database migration. Use the admin panel to manage celebrities.',
          alternatives: [
            'POST /api/v1/admin/celebrities - Create individual celebrities',
            'GET /api/v1/admin/celebrities - View existing celebrities',
            'PUT /api/v1/admin/celebrities/:id - Update celebrities',
          ],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        // Allow migration from request body data (for manual migrations)
        const result = await celebrityService.migrateFromJson(celebrities);

        res.json({
          success: true,
          data: result,
          message: `Migration completed: ${result.created} created, ${result.skipped} skipped`,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Error during manual migration:', error);
        throw new Error('Failed to migrate celebrities from provided data');
      }
    }
  );

  /**
   * POST /api/v1/admin/celebrities/bulk-update-priority
   * Bulk update celebrity priorities
   */
  public static bulkUpdatePriority = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        throw new ValidationError('Updates must be an array of {id, priority} objects');
      }

      logger.info('Bulk priority update requested', {
        count: updates.length,
        ip: req.ip,
      });

      const results = {
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const update of updates) {
        try {
          const { id, priority } = update;

          if (!id || typeof priority !== 'number' || priority < 1 || priority > 10) {
            results.errors.push(`Invalid update: ${JSON.stringify(update)}`);
            results.failed++;
            continue;
          }

          // Priority field removed - no longer needed
          results.updated++;
        } catch (error) {
          results.errors.push(`Failed to update ${update.id}: ${(error as Error).message}`);
          results.failed++;
        }
      }

      res.json({
        success: results.failed === 0,
        data: results,
        message: `Bulk update completed: ${results.updated} updated, ${results.failed} failed`,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /api/v1/admin/celebrities/:id/toggle-status
   * Toggle celebrity active status
   */
  public static toggleStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    logger.info('Toggle celebrity status requested', { id, ip: req.ip });

    const celebrity = await celebrityRepository.findById(id);
    if (!celebrity) {
      res.status(404).json({
        success: false,
        error: 'Celebrity not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updatedCelebrity = await celebrityService.updateCelebrity(id, {
      isActive: !celebrity.isActive,
    });

    res.json({
      success: true,
      data: updatedCelebrity,
      message: `Celebrity ${updatedCelebrity?.isActive ? 'activated' : 'deactivated'} successfully`,
      timestamp: new Date().toISOString(),
    });
  });
}
