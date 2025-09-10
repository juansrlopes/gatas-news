import { Router } from 'express';
import { NewsController } from '../controllers/newsController';
import {
  validatePagination,
  validateDateRange,
  validateSearch,
  validateSorting,
  validateCelebrityName,
  validateSentiment,
} from '../middleware/validation';
import { newsLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /api/v1/news
 * @desc    Get news articles with optional filtering
 * @access  Public
 * @params  ?page=1&celebrity=name&limit=20&sortBy=publishedAt
 */
router.get(
  '/',
  newsLimiter,
  validatePagination,
  validateDateRange,
  validateCelebrityName,
  validateSentiment,
  validateSorting(['publishedAt', 'relevancy', 'popularity']),
  NewsController.getNews
);

/**
 * @route   GET /api/v1/news/trending
 * @desc    Get trending topics/celebrities
 * @access  Public
 */
router.get('/trending', newsLimiter, NewsController.getTrending);

/**
 * @route   GET /api/v1/news/search
 * @desc    Search news articles with text search
 * @access  Public
 * @params  ?q=searchTerm&page=1&limit=20
 */
router.get(
  '/search',
  newsLimiter,
  validatePagination,
  validateSearch,
  validateSorting(['publishedAt', 'relevancy', 'popularity']),
  NewsController.getNews // Uses same controller, handles searchTerm param
);

/**
 * @route   GET /api/v1/news/recent
 * @desc    Get recent articles
 * @access  Public
 * @params  ?limit=20
 */
router.get(
  '/recent',
  newsLimiter,
  validatePagination,
  NewsController.getNews // Uses same controller with recent logic
);

/**
 * @route   GET /api/v1/news/popular
 * @desc    Get popular articles
 * @access  Public
 * @params  ?limit=10
 */
router.get(
  '/popular',
  newsLimiter,
  validatePagination,
  NewsController.getNews // Uses same controller with popular logic
);

/**
 * @route   POST /api/v1/news/cache/clear
 * @desc    Clear news cache (admin endpoint)
 * @access  Admin (should be protected in production)
 */
router.post(
  '/cache/clear',
  // TODO: Add authentication middleware for admin endpoints
  NewsController.clearCache
);

export default router;
