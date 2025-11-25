/**
 * Health Check Integration
 * WhatsApp SaaS Platform
 *
 * Production-ready health monitoring:
 * - Backend health checks
 * - Service status monitoring
 * - Uptime tracking
 * - Startup readiness checks
 *
 * @see https://docs.microsoft.com/azure/architecture/patterns/health-endpoint-monitoring
 */

import apiClient from './client';

/**
 * Service status type
 */
export type ServiceStatus = 'up' | 'down' | 'degraded';

/**
 * Overall health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Individual service health
 */
export interface ServiceHealth {
  status: ServiceStatus;
  responseTime?: number;
  lastCheck?: string;
  message?: string;
}

/**
 * Complete health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
    whatsapp: ServiceStatus;
    redis?: ServiceStatus;
    cache?: ServiceStatus;
    queue?: ServiceStatus;
  };
  version: string;
  uptime: number;
  environment?: string;
  checks?: {
    database?: ServiceHealth;
    whatsapp?: ServiceHealth;
    redis?: ServiceHealth;
    cache?: ServiceHealth;
    queue?: ServiceHealth;
  };
}

/**
 * Health check statistics
 */
export interface HealthStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  lastCheckTime?: Date;
  lastSuccessTime?: Date;
  lastFailureTime?: Date;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  interval: number; // Check interval in milliseconds
  timeout: number; // Request timeout in milliseconds
  retries: number; // Number of retries before marking as down
  onHealthChange?: (status: HealthStatus) => void;
  onServiceChange?: (service: string, status: ServiceStatus) => void;
}

/**
 * Default health monitor configuration
 */
const DEFAULT_MONITOR_CONFIG: HealthMonitorConfig = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
};

/**
 * Health check statistics tracker
 */
class HealthStatsTracker {
  private stats: HealthStats = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    averageResponseTime: 0,
  };

  private responseTimes: number[] = [];

  recordSuccess(responseTime: number): void {
    this.stats.totalChecks++;
    this.stats.successfulChecks++;
    this.stats.lastCheckTime = new Date();
    this.stats.lastSuccessTime = new Date();

    // Track response times for average calculation
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift(); // Keep last 100 samples
    }

    // Calculate average
    this.stats.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  recordFailure(): void {
    this.stats.totalChecks++;
    this.stats.failedChecks++;
    this.stats.lastCheckTime = new Date();
    this.stats.lastFailureTime = new Date();
  }

  getStats(): HealthStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
    };
    this.responseTimes = [];
  }
}

/**
 * Global health stats tracker
 */
const healthStats = new HealthStatsTracker();

/**
 * Check backend health
 *
 * @param timeout - Request timeout in milliseconds
 * @returns Health check response
 * @throws Error if health check fails
 */
export async function checkHealth(timeout = 5000): Promise<HealthCheckResponse> {
  const startTime = Date.now();

  try {
    const response = await apiClient.get<HealthCheckResponse>('/api/health', {
      skipAuth: true,
      skipRetry: false,
      timeout,
    } as any);

    const responseTime = Date.now() - startTime;
    healthStats.recordSuccess(responseTime);

    return response.data;
  } catch (error) {
    healthStats.recordFailure();
    throw error;
  }
}

/**
 * Check if backend is healthy
 *
 * @param timeout - Request timeout in milliseconds
 * @returns True if backend status is 'healthy'
 */
export async function isBackendHealthy(timeout = 5000): Promise<boolean> {
  try {
    const health = await checkHealth(timeout);
    return health.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Check if backend is available (any status except complete failure)
 *
 * @param timeout - Request timeout in milliseconds
 * @returns True if backend responds (even if degraded)
 */
export async function isBackendAvailable(timeout = 5000): Promise<boolean> {
  try {
    const health = await checkHealth(timeout);
    return health.status === 'healthy' || health.status === 'degraded';
  } catch {
    return false;
  }
}

/**
 * Wait for backend to be ready
 * Useful for development and testing scenarios
 *
 * @param maxAttempts - Maximum number of attempts
 * @param delayMs - Delay between attempts in milliseconds
 * @param onAttempt - Callback for each attempt
 * @returns True if backend becomes healthy, false if timeout
 */
export async function waitForBackend(
  maxAttempts = 10,
  delayMs = 1000,
  onAttempt?: (attempt: number, maxAttempts: number) => void
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (onAttempt) {
      onAttempt(i + 1, maxAttempts);
    }

    if (await isBackendHealthy(delayMs)) {
      return true;
    }

    // Don't delay after last attempt
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

/**
 * Check specific service health
 *
 * @param serviceName - Name of the service to check
 * @returns Service health information
 */
export async function checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
  try {
    const health = await checkHealth();
    const status = health.services[serviceName as keyof typeof health.services];
    const details = health.checks?.[serviceName as keyof typeof health.checks];

    return {
      status: status || 'down',
      responseTime: details?.responseTime,
      lastCheck: health.timestamp,
      message: details?.message,
    };
  } catch (error) {
    return {
      status: 'down',
      lastCheck: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

/**
 * Get health check statistics
 *
 * @returns Current health statistics
 */
export function getHealthStats(): HealthStats {
  return healthStats.getStats();
}

/**
 * Reset health statistics
 */
export function resetHealthStats(): void {
  healthStats.reset();
}

/**
 * Health monitor class for continuous monitoring
 */
export class HealthMonitor {
  private config: HealthMonitorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private currentStatus: HealthStatus = 'unhealthy';
  private isRunning = false;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[HealthMonitor] Already running');
      return;
    }

    this.isRunning = true;
    this.check(); // Immediate first check

    this.intervalId = setInterval(() => {
      this.check();
    }, this.config.interval);

    console.log(`[HealthMonitor] Started with ${this.config.interval}ms interval`);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[HealthMonitor] Stopped');
  }

  /**
   * Perform health check
   */
  private async check(): Promise<void> {
    try {
      const health = await checkHealth(this.config.timeout);

      // Check if status changed
      if (health.status !== this.currentStatus) {
        const oldStatus = this.currentStatus;
        this.currentStatus = health.status;

        console.log(`[HealthMonitor] Status changed: ${oldStatus} -> ${health.status}`);

        if (this.config.onHealthChange) {
          this.config.onHealthChange(health.status);
        }
      }

      // Check individual services
      if (this.config.onServiceChange) {
        Object.entries(health.services).forEach(([service, status]) => {
          this.config.onServiceChange!(service, status);
        });
      }
    } catch (error) {
      if (this.currentStatus !== 'unhealthy') {
        this.currentStatus = 'unhealthy';

        console.error('[HealthMonitor] Backend unhealthy:', error);

        if (this.config.onHealthChange) {
          this.config.onHealthChange('unhealthy');
        }
      }
    }
  }

  /**
   * Get current status
   */
  getStatus(): HealthStatus {
    return this.currentStatus;
  }

  /**
   * Check if monitoring is running
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }
}

/**
 * Create and start a health monitor
 *
 * @param config - Health monitor configuration
 * @returns HealthMonitor instance
 */
export function createHealthMonitor(config?: Partial<HealthMonitorConfig>): HealthMonitor {
  return new HealthMonitor(config);
}
