import { Router } from 'express';
import { RSSController } from '../controllers/rssController';

const router = Router();

/**
 * RSS Testing Routes
 */

// Test RSS feeds
router.get('/test', RSSController.testRSSFeeds);

// Test RSS for specific celebrity
router.get('/celebrity/:name', RSSController.testCelebrityRSS);

// Test multi-source for specific celebrity
router.get('/multi-source/:name', RSSController.testMultiSource);

export default router;
