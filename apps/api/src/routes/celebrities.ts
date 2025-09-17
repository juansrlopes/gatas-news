import { Router } from 'express';
import { CelebrityController } from '../controllers/celebrityController';
import { adminLimiter } from '../middleware/rateLimiter';
import { validatePagination, validateSearch, validateSorting } from '../middleware/validation';

const router = Router();

// Note: In production, you should add authentication middleware here
// Example: router.use(authMiddleware.requireAdmin);

/**
 * @route   GET /api/v1/admin/celebrities
 * @desc    Get celebrities with pagination and filters
 * @access  Admin
 * @params  ?page=1&limit=20&category=singer&minPriority=5&maxPriority=10&isActive=true&sortBy=priority&sortOrder=desc
 */
router.get(
  '/',
  adminLimiter,
  validatePagination,
  validateSorting(['name', 'totalArticles', 'avgArticlesPerDay', 'createdAt']),
  CelebrityController.getCelebrities
);

/**
 * @route   GET /api/v1/admin/celebrities/search
 * @desc    Search celebrities by name, aliases, or search terms
 * @access  Admin
 * @params  ?q=searchTerm&page=1&limit=20
 */
router.get(
  '/search',
  adminLimiter,
  validatePagination,
  validateSearch,
  CelebrityController.searchCelebrities
);

/**
 * @route   GET /api/v1/admin/celebrities/stats
 * @desc    Get celebrity statistics
 * @access  Admin
 */
router.get('/stats', adminLimiter, CelebrityController.getCelebrityStats);

/**
 * @route   GET /api/v1/admin/celebrities/top-performers
 * @desc    Get top performing celebrities
 * @access  Admin
 * @params  ?limit=10
 */
router.get('/top-performers', adminLimiter, CelebrityController.getTopPerformers);

/**
 * @route   POST /api/v1/admin/celebrities/bulk-update-priority
 * @desc    Bulk update celebrity priorities
 * @access  Admin
 * @body    { updates: [{ id: string, priority: number }] }
 */
router.post('/bulk-update-priority', adminLimiter, CelebrityController.bulkUpdatePriority);

/**
 * @route   POST /api/v1/admin/celebrities
 * @desc    Create new celebrity
 * @access  Admin
 * @body    { name, category, priority?, aliases?, searchTerms?, socialMedia?, description? }
 */
router.post('/', adminLimiter, CelebrityController.createCelebrity);

/**
 * @route   GET /api/v1/admin/celebrities/:id
 * @desc    Get celebrity by ID
 * @access  Admin
 */
router.get('/:id', adminLimiter, CelebrityController.getCelebrityById);

/**
 * @route   PUT /api/v1/admin/celebrities/:id
 * @desc    Update celebrity
 * @access  Admin
 * @body    { name?, category?, priority?, aliases?, searchTerms?, socialMedia?, description?, isActive? }
 */
router.put('/:id', adminLimiter, CelebrityController.updateCelebrity);

/**
 * @route   DELETE /api/v1/admin/celebrities/:id
 * @desc    Soft delete celebrity (mark as inactive)
 * @access  Admin
 */
router.delete('/:id', adminLimiter, CelebrityController.deleteCelebrity);

/**
 * @route   POST /api/v1/admin/celebrities/:id/toggle-status
 * @desc    Toggle celebrity active status
 * @access  Admin
 */
router.post('/:id/toggle-status', adminLimiter, CelebrityController.toggleStatus);

export default router;
