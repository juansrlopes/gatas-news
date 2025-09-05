import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { validateHealthCheck } from '../middleware/validation';
import { healthLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthLimiter, validateHealthCheck, HealthController.healthCheck);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with system info
 * @access  Public
 */
router.get('/detailed', healthLimiter, validateHealthCheck, HealthController.detailedHealthCheck);

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for container orchestration
 * @access  Public
 */
router.get('/ready', validateHealthCheck, HealthController.readinessCheck);

/**
 * @route   GET /health/live
 * @desc    Liveness probe for container orchestration
 * @access  Public
 */
router.get('/live', validateHealthCheck, HealthController.livenessCheck);

export default router;
