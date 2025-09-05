import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// Note: In production, you should add authentication middleware here
// Example: router.use(authMiddleware.requireAdmin);

/**
 * Fetch Management Routes
 */

/**
 * @route   POST /api/v1/admin/fetch/trigger
 * @desc    Manually trigger news fetch
 * @access  Admin
 */
router.post('/fetch/trigger', generalLimiter, AdminController.triggerNewsFetch);

/**
 * @route   GET /api/v1/admin/fetch/status
 * @desc    Get fetch job status and history
 * @access  Admin
 */
router.get('/fetch/status', generalLimiter, AdminController.getFetchStatus);

/**
 * @route   GET /api/v1/admin/fetch/logs
 * @desc    Get detailed fetch logs with pagination
 * @access  Admin
 * @params  ?page=1&limit=20&status=success|failed|partial
 */
router.get('/fetch/logs', generalLimiter, AdminController.getFetchLogs);

/**
 * @route   GET /api/v1/admin/fetch/statistics
 * @desc    Get fetch statistics
 * @access  Admin
 */
router.get('/fetch/statistics', generalLimiter, AdminController.getFetchStatistics);

/**
 * Cache Management Routes
 */

/**
 * @route   POST /api/v1/admin/cache/clear
 * @desc    Clear all cache
 * @access  Admin
 */
router.post('/cache/clear', generalLimiter, AdminController.clearCache);

/**
 * @route   POST /api/v1/admin/cache/clear/news
 * @desc    Clear only news-related cache
 * @access  Admin
 */
router.post('/cache/clear/news', generalLimiter, AdminController.clearNewsCache);

/**
 * @route   GET /api/v1/admin/cache/stats
 * @desc    Get cache statistics
 * @access  Admin
 */
router.get('/cache/stats', generalLimiter, AdminController.getCacheStats);

/**
 * System Management Routes
 */

/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Comprehensive system health check
 * @access  Admin
 */
router.get('/system/health', generalLimiter, AdminController.getSystemHealth);

/**
 * @route   GET /api/v1/admin/database/stats
 * @desc    Get database statistics
 * @access  Admin
 */
router.get('/database/stats', generalLimiter, AdminController.getDatabaseStats);

/**
 * Article Management Routes
 */

/**
 * @route   GET /api/v1/admin/articles/stats
 * @desc    Get detailed article statistics
 * @access  Admin
 */
router.get('/articles/stats', generalLimiter, AdminController.getArticleStats);

/**
 * @route   POST /api/v1/admin/articles/:id/toggle
 * @desc    Toggle article active status
 * @access  Admin
 */
router.post('/articles/:id/toggle', generalLimiter, AdminController.toggleArticleStatus);

/**
 * @route   DELETE /api/v1/admin/articles/:id
 * @desc    Delete article (hard delete)
 * @access  Admin
 */
router.delete('/articles/:id', generalLimiter, AdminController.deleteArticle);

/**
 * Scheduler Management Routes
 */

/**
 * @route   POST /api/v1/admin/scheduler/jobs/:jobName/stop
 * @desc    Stop a scheduled job
 * @access  Admin
 */
router.post('/scheduler/jobs/:jobName/stop', generalLimiter, AdminController.stopScheduledJob);

export default router;
