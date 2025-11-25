import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      pid: process.pid,
    };
  }

  getRoot() {
    return {
      name: 'WhatsApp SaaS API',
      version: '1.0.0',
      description: 'WhatsApp Cloud API Booking SaaS Platform',
      documentation: '/api/docs',
      health: '/api/v1/health',
    };
  }
}
