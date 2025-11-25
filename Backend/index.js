'use strict';

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import modules
const compression = require('compression');
const secrets = require('./src/config/secrets');
const webhook = require('./src/webhook');
const salons = require('./src/salons');
const logger = require('./src/utils/logger');
const db = require('./src/database/client');
const redis = require('./src/cache/redis');
const messageQueue = require('./src/queue/messageQueue');
const aiAnalytics = require('./src/ai/analytics');
const conversationManager = require('./src/ai/conversationManager');
const {
  webhookLimiter,
  adminLimiter,
  corsOptions,
  securityHeaders,
  requestLogger,
  errorHandler
} = require('./src/middleware/security');
const {
  validateSalon,
  validateBookingQuery,
  validateMessageQuery,
  validateStatsQuery
} = require('./src/utils/validation');
const { cachePresets } = require('./src/middleware/cache');
const { metricsMiddleware, metricsEndpoint } = require('./src/middleware/metrics');

const app = express();
const PORT = process.env.PORT || 3000;
let ADMIN_TOKEN = null; // Will be loaded from secrets

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Compression middleware (before other middleware for maximum benefit)
app.use(compression({
  level: 6,           // gzip compression level (1-9, 6 is good balance)
  threshold: 1024,    // only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client sends x-no-compression header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression's default filter for other cases
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(require('cors')(corsOptions));

// Request logging
app.use(requestLogger);

// Prometheus metrics middleware
app.use(metricsMiddleware);

// Capture raw body for HMAC verification while still parsing JSON
app.use(bodyParser.json({ 
  verify: (req, _res, buf) => { 
    req.rawBody = buf; 
  },
  limit: '10mb'
}));

// Health check endpoint (no rate limiting, 30s cache)
app.get('/healthz', cachePresets.healthCheck(), async (_req, res) => {
  try {
    const [dbHealth, redisHealth, queueStats] = await Promise.allSettled([
      db.healthCheck(),
      redis.healthCheck(),
      messageQueue.getAllStats()
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'error', error: dbHealth.reason?.message },
        redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'error', error: redisHealth.reason?.message },
        queues: queueStats.status === 'fulfilled' ? queueStats.value : { status: 'error', error: queueStats.reason?.message }
      }
    };

    const isHealthy = health.services.database.status === 'healthy' &&
                     health.services.redis.status === 'healthy';

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Prometheus metrics endpoint (for scraping by Prometheus)
app.get('/metrics', metricsEndpoint);

// Database metrics endpoint
app.get('/metrics/database', async (_req, res) => {
  try {
    const metrics = await db.getDatabaseMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get database metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'WhatsApp SaaS Starter is running',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Admin endpoints with rate limiting and validation
app.post('/admin/salons', adminLimiter, (req, res, next) => {
  // Check admin token
  if (!ADMIN_TOKEN) {
    logger.warn('Admin endpoint accessed but ADMIN_TOKEN not configured');
    return res.status(503).json({ error: 'Admin functionality not configured' });
  }
  
  const providedToken = req.get('x-admin-token');
  if (!providedToken || providedToken !== ADMIN_TOKEN) {
    logger.warn(`Unauthorized admin access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}, validateSalon, (req, res, next) => {
  try {
    const saved = salons.upsert(req.body);
    logger.info(`Salon created/updated: ${saved.id} (${saved.name})`);
    res.json(saved);
  } catch (error) {
    logger.error('Failed to upsert salon:', error);
    next(error);
  }
});

// Get all salons (admin only)
app.get('/admin/salons', adminLimiter, (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const allSalons = salons.load();
    res.json(allSalons);
  } catch (error) {
    logger.error('Failed to load salons:', error);
    next(error);
  }
});

// AI Analytics endpoints (15 min cache)
app.get('/admin/ai/analytics/:salonId', adminLimiter, cachePresets.aiAnalytics(), async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { salonId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await aiAnalytics.getFullAnalytics(salonId, start, end);
    res.json(analytics);
  } catch (error) {
    logger.error('Failed to get AI analytics:', error);
    next(error);
  }
});

// AI Conversation stats (15 min cache)
app.get('/admin/ai/conversations/:salonId', adminLimiter, cachePresets.aiAnalytics(), async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { salonId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await aiAnalytics.getConversationStats(salonId, start, end);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get conversation stats:', error);
    next(error);
  }
});

// Get bookings with pagination (1 min cache)
app.get('/admin/bookings/:salonId', adminLimiter, validateBookingQuery, cachePresets.bookings(), async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { salonId } = req.params;
    const { page, limit, status } = req.query;

    // Build filters
    const filters = {};
    if (status) {
      filters.status = status;
    }

    // Get paginated bookings
    const result = await db.getBookingsBySalon(salonId, filters, { page, limit });
    res.json(result);
  } catch (error) {
    logger.error('Failed to get bookings:', error);
    next(error);
  }
});

// Get messages with pagination (1 min cache)
app.get('/admin/messages/:salonId', adminLimiter, validateMessageQuery, cachePresets.messages(), async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { salonId } = req.params;
    const { page, limit, direction } = req.query;

    // Build filters
    const filters = {};
    if (direction) {
      filters.direction = direction;
    }

    // Get paginated messages
    const result = await db.getMessagesBySalon(salonId, filters, { page, limit });
    res.json(result);
  } catch (error) {
    logger.error('Failed to get messages:', error);
    next(error);
  }
});

// Get salon stats with caching (2 min cache)
app.get('/admin/stats/:salonId', adminLimiter, validateStatsQuery, cachePresets.stats(), async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { salonId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await db.getSalonStats(salonId, start, end);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get salon stats:', error);
    next(error);
  }
});

// Meta webhook verification and receiver with rate limiting (never cache webhooks)
app.get('/webhook', cachePresets.webhook(), webhook.verify);
app.post('/webhook', webhookLimiter, cachePresets.webhook(), webhook.receive);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize services
async function initializeServices() {
  try {
    // 1. Initialize secrets first (critical dependency)
    logger.info('Initializing secrets...');
    await secrets.initialize();

    // Load ADMIN_TOKEN from secrets
    ADMIN_TOKEN = secrets.get('ADMIN_TOKEN');
    if (!ADMIN_TOKEN) {
      logger.warn('ADMIN_TOKEN not configured - admin endpoints will be unavailable');
    }

    // 2. Initialize AI conversation manager
    logger.info('Initializing AI conversation manager...');
    await conversationManager.initialize();

    // 3. Connect to database
    logger.info('Connecting to database...');
    await db.connect();

    // 4. Connect to Redis
    logger.info('Connecting to Redis...');
    await redis.connect();

    // 5. Initialize message queue
    logger.info('Initializing message queue...');
    await messageQueue.initialize();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    logger.error('Application cannot start without required secrets');
    process.exit(1);
  }
}

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Server listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Admin token configured: ${!!ADMIN_TOKEN}`);
  
  // Initialize services after server starts
  await initializeServices();
});

// Admin endpoint to manually refresh secrets (emergency use)
app.post('/admin/refresh-secrets', adminLimiter, async (req, res, next) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await secrets.refresh();

    // Reinitialize conversation manager with new secrets
    await conversationManager.initialize();

    res.json({
      success: true,
      message: 'Secrets refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to refresh secrets:', error);
    next(error);
  }
});

// Secrets health check endpoint
app.get('/admin/secrets/health', adminLimiter, (req, res) => {
  if (!ADMIN_TOKEN || req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const health = secrets.healthCheck();
  res.json(health);
});

// Graceful shutdown for server
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down server gracefully`);

  try {
    // Close message queue first
    await messageQueue.close();

    // Disconnect from Redis
    await redis.disconnect();

    // Disconnect from database
    await db.disconnect();

    // Clear secrets from memory
    secrets.shutdown();

    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));