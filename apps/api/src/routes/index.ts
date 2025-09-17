import { Router } from 'express';
import newsRoutes from './news';
import healthRoutes from './health';
import adminRoutes from './admin';
import celebritiesRoutes from './celebrities';
import rssRoutes from './rss';

const router = Router();

// API Routes
router.use('/news', newsRoutes);
router.use('/celebrities', celebritiesRoutes);

// RSS Testing Routes (development/testing)
router.use('/rss', rssRoutes);

// Admin Routes (should be protected in production)
router.use('/admin', adminRoutes);

// Health Routes (not versioned for simplicity)
router.use('/health', healthRoutes);

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Gatas News API',
    version: '1.0.0',
    description: 'API for fetching news about famous women',
    endpoints: {
      news: '/api/v1/news',
      celebrities: '/api/v1/celebrities',
      trending: '/api/v1/news/trending',
      admin: '/api/v1/admin',
      health: '/health',
      healthDetailed: '/health/detailed',
      readiness: '/health/ready',
      liveness: '/health/live',
      // RSS Testing endpoints
      rssTest: '/api/v1/rss/test',
      rssCelebrity: '/api/v1/rss/celebrity/:name',
      rssMultiSource: '/api/v1/rss/multi-source/:name',
    },
    documentation: 'https://github.com/yourusername/gatas-news',
    timestamp: new Date().toISOString(),
  });
});

export default router;
