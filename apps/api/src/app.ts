import express from 'express';
import compression from 'compression';
import { securityMiddleware, corsMiddleware } from './middleware/security';
import { requestLogger, errorLogger } from './middleware/logging';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import healthRoutes from './routes/health';

// const config = getEnvConfig(); // Uncomment if needed for environment-specific configuration

// Create Express app
const app = express();

// Trust proxy (important for rate limiting and logging behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware (should be first)
app.use(securityMiddleware);
app.use(corsMiddleware);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Rate limiting (after logging, before routes)
app.use(generalLimiter);

// Health check routes (not versioned, available at root)
app.use('/health', healthRoutes);

// API routes (versioned)
app.use('/api/v1', routes);


// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Gatas News API',
    version: '1.0.0',
    description: 'API for fetching news about famous women',
    documentation: 'https://github.com/yourusername/gatas-news',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      news: '/api/v1/news',
      trending: '/api/v1/news/trending',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error logging middleware (after routes, before error handler)
app.use(errorLogger);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
