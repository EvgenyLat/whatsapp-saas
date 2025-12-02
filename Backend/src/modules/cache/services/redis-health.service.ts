import { Injectable, Logger } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';

/**
 * Redis Health Check Service
 *
 * Monitors Redis connection health and performance metrics.
 */
@Injectable()
export class RedisHealthService {
  private readonly logger = new Logger(RedisHealthService.name);

  constructor(private readonly redisConnection: RedisConnectionService) {}

  /**
   * Comprehensive health check
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    connected: boolean;
    latency: number;
    memory?: {
      used: number;
      peak: number;
      fragmentation: number;
    };
    errors?: string[];
  }> {
    const errors: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check connection
    const connected = this.redisConnection.isRedisConnected();
    if (!connected) {
      errors.push('Redis is not connected');
      status = 'unhealthy';
    }

    // Measure latency
    const latency = await this.measureLatency();
    if (latency > 100) {
      errors.push(`High latency: ${latency}ms`);
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Check memory usage
    let memory: { used: number; peak: number; fragmentation: number } | undefined;
    try {
      memory = await this.getMemoryUsage();
      if (memory.fragmentation > 1.5) {
        errors.push(`High memory fragmentation: ${memory.fragmentation}`);
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } catch (error) {
      errors.push(`Failed to get memory info: ${error.message}`);
      status = 'degraded';
    }

    return {
      status,
      connected,
      latency,
      memory,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Measure Redis latency
   */
  async measureLatency(): Promise<number> {
    const start = Date.now();
    try {
      await this.redisConnection.ping();
      return Date.now() - start;
    } catch (error) {
      this.logger.error(`Failed to measure latency: ${error.message}`);
      return -1;
    }
  }

  /**
   * Get Redis memory usage
   */
  async getMemoryUsage(): Promise<{
    used: number;
    peak: number;
    fragmentation: number;
  }> {
    try {
      const client = this.redisConnection.getClient();
      const info = await client.info('memory');

      const usedMemory = this.parseInfoValue(info, 'used_memory');
      const peakMemory = this.parseInfoValue(info, 'used_memory_peak');
      const fragmentation = this.parseInfoValue(info, 'mem_fragmentation_ratio');

      return {
        used: usedMemory,
        peak: peakMemory,
        fragmentation: fragmentation,
      };
    } catch (error) {
      this.logger.error(`Failed to get memory usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Redis database size
   */
  async getDatabaseSize(): Promise<number> {
    try {
      const client = this.redisConnection.getClient();
      return await client.dbsize();
    } catch (error) {
      this.logger.error(`Failed to get database size: ${error.message}`);
      return -1;
    }
  }

  /**
   * Check if Redis is ready for operations
   */
  async isReady(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status !== 'unhealthy';
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse value from Redis INFO output
   */
  private parseInfoValue(info: string, key: string): number {
    const regex = new RegExp(`${key}:([0-9.]+)`);
    const match = info.match(regex);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    connected: boolean;
    reconnectAttempts: number;
    uptime?: number;
  }> {
    const connInfo = this.redisConnection.getConnectionInfo();

    let uptime: number | undefined;
    try {
      const client = this.redisConnection.getClient();
      const info = await client.info('server');
      uptime = this.parseInfoValue(info, 'uptime_in_seconds');
    } catch (error) {
      this.logger.error(`Failed to get uptime: ${error.message}`);
    }

    return {
      ...connInfo,
      uptime,
    };
  }
}
