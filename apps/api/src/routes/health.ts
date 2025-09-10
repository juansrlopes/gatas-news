import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { healthLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthLimiter, HealthController.healthCheck);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with system info
 * @access  Public
 */
router.get('/detailed', healthLimiter, HealthController.detailedHealthCheck);

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for container orchestration
 * @access  Public
 */
router.get('/ready', HealthController.readinessCheck);

/**
 * @route   GET /health/live
 * @desc    Liveness probe for container orchestration
 * @access  Public
 */
router.get('/live', HealthController.livenessCheck);

export default router;
