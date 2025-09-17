import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { NewsController } from '../controllers/newsController';
import { adminLimiter } from '../middleware/rateLimiter';
import { validatePagination } from '../middleware/validation';
import celebrityRoutes from './celebrities';

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
router.post('/fetch/trigger', adminLimiter, AdminController.triggerNewsFetch);

/**
 * @route   POST /api/v1/admin/fetch-now
 * @desc    Simple manual fetch trigger (development only)
 * @access  Development
 */
router.post('/fetch-now', adminLimiter, NewsController.triggerFetch);

/**
 * @route   GET /api/v1/admin/fetch/status
 * @desc    Get fetch job status and history
 * @access  Admin
 */
router.get('/fetch/status', adminLimiter, AdminController.getFetchStatus);

/**
 * @route   GET /api/v1/admin/fetch/logs
 * @desc    Get detailed fetch logs with pagination
 * @access  Admin
 * @params  ?page=1&limit=20&status=success|failed|partial
 */
router.get('/fetch/logs', adminLimiter, validatePagination, AdminController.getFetchLogs);

/**
 * @route   GET /api/v1/admin/fetch/statistics
 * @desc    Get fetch statistics
 * @access  Admin
 */
router.get('/fetch/statistics', adminLimiter, AdminController.getFetchStatistics);

/**
 * Cache Management Routes
 */

/**
 * @route   POST /api/v1/admin/cache/clear
 * @desc    Clear all cache
 * @access  Admin
 */
router.post('/cache/clear', adminLimiter, AdminController.clearCache);

/**
 * @route   POST /api/v1/admin/cache/clear/news
 * @desc    Clear only news-related cache
 * @access  Admin
 */
router.post('/cache/clear/news', adminLimiter, AdminController.clearNewsCache);

/**
 * @route   GET /api/v1/admin/cache/stats
 * @desc    Get cache statistics
 * @access  Admin
 */
router.get('/cache/stats', adminLimiter, AdminController.getCacheStats);

/**
 * System Management Routes
 */

/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Comprehensive system health check
 * @access  Admin
 */
router.get('/system/health', adminLimiter, AdminController.getSystemHealth);

/**
 * @route   GET /api/v1/admin/database/stats
 * @desc    Get database statistics
 * @access  Admin
 */
router.get('/database/stats', adminLimiter, AdminController.getDatabaseStats);

/**
 * Article Management Routes
 */

/**
 * @route   GET /api/v1/admin/articles/stats
 * @desc    Get detailed article statistics
 * @access  Admin
 */
router.get('/articles/stats', adminLimiter, AdminController.getArticleStats);

/**
 * @route   POST /api/v1/admin/articles/:id/toggle
 * @desc    Toggle article active status
 * @access  Admin
 */
router.post('/articles/:id/toggle', adminLimiter, AdminController.toggleArticleStatus);

/**
 * @route   DELETE /api/v1/admin/articles/cleanup-unknown
 * @desc    Permanently remove unknown articles from database
 * @access  Admin
 */
router.delete('/articles/cleanup-unknown', adminLimiter, AdminController.cleanupUnknownArticles);

/**
 * @route   DELETE /api/v1/admin/articles/:id
 * @desc    Delete article (hard delete)
 * @access  Admin
 */
router.delete('/articles/:id', adminLimiter, AdminController.deleteArticle);

/**
 * @route   DELETE /api/v1/admin/articles/clear
 * @desc    Clear all articles from database (for testing)
 * @access  Admin
 */
router.delete('/articles/clear', adminLimiter, AdminController.clearAllArticles);

/**
 * @route   POST /api/v1/admin/articles/restore-quality
 * @desc    Reactivate backed-up articles that meet quality criteria
 * @access  Admin
 */
router.post('/articles/restore-quality', adminLimiter, AdminController.restoreQualityArticles);

/**
 * @route   POST /api/v1/admin/articles/backup
 * @desc    Mark all current articles as inactive (backup for fresh start)
 * @access  Admin
 */
router.post('/articles/backup', adminLimiter, AdminController.backupArticles);

/**
 * @route   GET /api/v1/admin/articles/quality-analysis
 * @desc    Analyze article quality for trash filtering (Phase 1 Diagnostics)
 * @access  Admin
 */
router.get('/articles/quality-analysis', adminLimiter, AdminController.analyzeArticleQuality);

/**
 * @route   GET /api/v1/admin/articles/quality-analysis-enhanced
 * @desc    Enhanced quality analysis using quality scoring system
 * @access  Admin
 * @params  ?sample=100&scores=true
 */
router.get('/articles/quality-analysis-enhanced', adminLimiter, AdminController.analyzeArticleQualityEnhanced);

/**
 * @route   POST /api/v1/admin/articles/cleanup-phase1
 * @desc    Phase 1 cleanup: Remove obvious non-celebrity trash (<5% target)
 * @access  Admin
 * @params  ?dryRun=true (optional - preview without removing)
 */
router.post('/articles/cleanup-phase1', adminLimiter, AdminController.cleanupPhase1);

/**
 * Scheduler Management Routes
 */

/**
 * @route   POST /api/v1/admin/scheduler/jobs/:jobName/stop
 * @desc    Stop a scheduled job
 * @access  Admin
 */
router.post('/scheduler/jobs/:jobName/stop', adminLimiter, AdminController.stopScheduledJob);

/**
 * API Key Management Routes
 */

/**
 * @route   GET /api/v1/admin/keys/status
 * @desc    Get comprehensive API key health status
 * @access  Admin
 */
router.get('/keys/status', adminLimiter, AdminController.getKeyStatus);

/**
 * @route   POST /api/v1/admin/keys/health-check
 * @desc    Force health check on all API keys
 * @access  Admin
 */
router.post('/keys/health-check', adminLimiter, AdminController.forceKeyHealthCheck);

/**
 * @route   POST /api/v1/admin/keys/reset-stats
 * @desc    Reset daily API key statistics
 * @access  Admin
 */
router.post('/keys/reset-stats', adminLimiter, AdminController.resetKeyStats);

/**
 * @route   GET /api/v1/admin/keys/best
 * @desc    Get the current best API key recommendation
 * @access  Admin
 */
router.get('/keys/best', adminLimiter, AdminController.getBestKey);

/**
 * Celebrity Management Routes
 */
router.use('/celebrities', celebrityRoutes);

export default router;
