import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { SerperController } from '../controllers/serperController';
import { SerperTestController } from '../controllers/serperTestController';
import { RSSAdminController } from '../controllers/rssAdminController';
import { CelebrityCoverageController } from '../controllers/celebrityCoverageController';
import { adminLimiter } from '../middleware/rateLimiter';
import { validatePagination } from '../middleware/validation';
import celebrityRoutes from './celebrities';

const router = Router();

// Note: In production, you should add authentication middleware here
// Example: router.use(authMiddleware.requireAdmin);

/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Get comprehensive system health status
 * @access  Admin
 */
router.get('/system/health', adminLimiter, AdminController.getSystemHealth);

/**
 * @route   GET /api/v1/admin/database/stats
 * @desc    Get database statistics and performance metrics
 * @access  Admin
 */
router.get('/database/stats', adminLimiter, AdminController.getDatabaseStats);

/**
 * @route   GET /api/v1/admin/articles/stats
 * @desc    Get article statistics and analytics
 * @access  Admin
 */
router.get('/articles/stats', validatePagination, adminLimiter, AdminController.getArticleStats);

/**
 * @route   DELETE /api/v1/admin/articles/clear
 * @desc    Clear all articles from database (for testing)
 * @access  Admin
 */
router.delete('/articles/clear', adminLimiter, AdminController.clearAllArticles);

/**
 * @route   POST /api/v1/admin/articles/quality-analysis
 * @desc    Analyze article quality and get recommendations
 * @access  Admin
 */
router.post('/articles/quality-analysis', adminLimiter, AdminController.analyzeArticleQuality);

/**
 * @route   POST /api/v1/admin/fetch/trigger
 * @desc    Manually trigger news fetch
 * @access  Admin
 */
router.post('/fetch/trigger', adminLimiter, AdminController.triggerNewsFetch);

/**
 * @route   POST /api/v1/admin/fetch/multi-source
 * @desc    Manually trigger multi-source news fetch (Serper + RSS)
 * @access  Admin
 */
router.post("/fetch/multi-source", adminLimiter, AdminController.triggerMultiSourceFetch);

/**
 * @route   POST /api/v1/admin/articles/update-rss-images
 * @desc    Update existing RSS articles with scraped images
 * @access  Admin
 */
router.post("/articles/update-rss-images", adminLimiter, AdminController.updateRSSImages);

/**
 * @route   GET /api/v1/admin/fetch/status
 * @desc    Get fetch job status and history
 * @access  Admin
 */
router.get('/fetch/status', adminLimiter, AdminController.getFetchStatus);

/**
 * @route   GET /api/v1/admin/cache/stats
 * @desc    Get cache statistics and performance metrics
 * @access  Admin
 */
router.get('/cache/stats', adminLimiter, AdminController.getCacheStats);

/**
 * @route   POST /api/v1/admin/cache/clear
 * @desc    Clear all cache entries
 * @access  Admin
 */
router.post('/cache/clear', adminLimiter, AdminController.clearCache);

/**
 * @route   POST /api/v1/admin/cache/clear/news
 * @desc    Clear only news-related cache entries
 * @access  Admin
 */
router.post('/cache/clear/news', adminLimiter, AdminController.clearNewsCache);

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
 * @desc    Get the best performing API key
 * @access  Admin
 */
router.get('/keys/best', adminLimiter, AdminController.getBestKey);

// Celebrity management routes
router.use('/celebrities', celebrityRoutes);

/**
 * Celebrity Coverage Analysis Routes
 */

/**
 * @route   GET /api/v1/admin/coverage/stats
 * @desc    Get celebrity coverage statistics
 * @access  Admin
 */
router.get('/coverage/stats', adminLimiter, CelebrityCoverageController.getCoverageStats);

/**
 * @route   GET /api/v1/admin/coverage/zero-articles
 * @desc    Get celebrities with zero articles
 * @access  Admin
 */
router.get('/coverage/zero-articles', adminLimiter, CelebrityCoverageController.getCelebritiesWithZeroArticles);

/**
 * @route   POST /api/v1/admin/coverage/prioritize-celebrities
 * @desc    Get a prioritized list of celebrities for the next fetch
 * @access  Admin
 */
router.post('/coverage/prioritize-celebrities', adminLimiter, CelebrityCoverageController.prioritizeCelebritiesForFetch);

/**
 * RSS Feed Management Routes
 */

/**
 * @route   GET /api/v1/admin/rss/stats
 * @desc    Get RSS feed statistics and status
 * @access  Admin
 */
router.get('/rss/stats', adminLimiter, RSSAdminController.getRSSStats);

/**
 * @route   GET /api/v1/admin/rss/feeds
 * @desc    Get list of all RSS feeds with their status
 * @access  Admin
 */
router.get('/rss/feeds', adminLimiter, RSSAdminController.getRSSFeeds);

/**
 * @route   POST /api/v1/admin/rss/test-feed
 * @desc    Test a specific RSS feed URL
 * @access  Admin
 */
router.post('/rss/test-feed', adminLimiter, RSSAdminController.testRSSFeed);

/**
 * @route   POST /api/v1/admin/rss/test-all
 * @desc    Test all enabled RSS feeds
 * @access  Admin
 */
router.post('/rss/test-all', adminLimiter, RSSAdminController.testAllRSSFeeds);

/**
 * Serper API Testing Routes
 */

/**
 * @route   GET /api/v1/admin/serper/test
 * @desc    Test Serper API with sample celebrity search
 * @access  Admin
 */
router.get('/serper/test', adminLimiter, SerperController.testSerperApi);

/**
 * @route   GET /api/v1/admin/serper/simple-test
 * @desc    Simple Serper test for debugging
 * @access  Admin
 */
router.get('/serper/simple-test', SerperTestController.simpleTest);

/**
 * @route   GET /api/v1/admin/serper/batch-test
 * @desc    Test Serper batch search with multiple celebrities
 * @access  Admin
 */
router.get('/serper/batch-test', adminLimiter, SerperController.testBatchSearch);

/**
 * @route   GET /api/v1/admin/serper/batch-size-test
 * @desc    Test different batch sizes for optimal configuration
 * @access  Admin
 */
router.get('/serper/batch-size-test', adminLimiter, SerperController.testBatchSizes);

/**
 * @route   GET /api/v1/admin/serper/max-batch-test
 * @desc    Find the MAXIMUM batch size that Serper can handle
 * @access  Admin
 */
router.get('/serper/max-batch-test', adminLimiter, SerperController.testMaximumBatchSize);

/**
 * @route   GET /api/v1/admin/serper/live-search
 * @desc    Test Serper live search functionality
 * @access  Admin
 */
router.get('/serper/live-search', adminLimiter, SerperController.testLiveSearch);

/**
 * @route   GET /api/v1/admin/serper/trending
 * @desc    Test Serper trending news functionality
 * @access  Admin
 */
router.get('/serper/trending', adminLimiter, SerperController.testTrendingNews);

/**
 * @route   GET /api/v1/admin/serper/validate-key
 * @desc    Validate Serper API key
 * @access  Admin
 */
router.get('/serper/validate-key', adminLimiter, SerperController.validateApiKey);

/**
 * @route   GET /api/v1/admin/serper/compare
 * @desc    Compare Serper vs NewsAPI results
 * @access  Admin
 */
router.get('/serper/compare', adminLimiter, SerperController.compareWithNewsApi);

/**
 * @route   GET /api/v1/admin/serper/usage
 * @desc    Get Serper API usage statistics
 * @access  Admin
 */
router.get('/serper/usage', adminLimiter, AdminController.getSerperUsage);

/**
 * @route   POST /api/v1/admin/serper/reset-usage
 * @desc    Reset Serper usage counters (for testing/emergency)
 * @access  Admin
 */
router.post('/serper/reset-usage', adminLimiter, AdminController.resetSerperUsage);

export default router;