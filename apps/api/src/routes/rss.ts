import { Router } from 'express';
import { RSSController } from '../controllers/rssController';

const router = Router();

/**
 * @route   GET /api/v1/rss/feeds
 * @desc    Get all RSS feeds and their articles
 * @access  Public
 */
router.get('/feeds', RSSController.getFeeds);

/**
 * @route   GET /api/v1/rss/celebrity/:celebrityName
 * @desc    Get RSS articles for a specific celebrity
 * @access  Public
 */
router.get('/celebrity/:celebrityName', RSSController.getCelebrityArticles);

/**
 * @route   GET /api/v1/rss/multi-source/:celebrityName
 * @desc    Get multi-source articles for a specific celebrity
 * @access  Public
 */
router.get('/multi-source/:celebrityName', RSSController.getMultiSourceArticles);

export default router;