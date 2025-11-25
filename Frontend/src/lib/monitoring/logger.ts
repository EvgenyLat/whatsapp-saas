/**
 * Production Logging System
 * WhatsApp SaaS Platform
 *
 * Structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Contextual metadata
 * - Request ID tracking
 * - Performance monitoring
 * - Production-safe output
 *
 * @see https://12factor.net/logs
 */

import { env, isProduction, isDevelopment } from '../env';

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log level priority (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Log context metadata
 */
export interface LogContext {
  [key: string]: any;
  timestamp?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  environment: string;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string;
  log: (entry: LogEntry) => void | Promise<void>;
}

/**
 * Console transport for development
 */
class ConsoleTransport implements LogTransport {
  name = 'console';

  log(entry: LogEntry): void {
    const { level, message, timestamp, context } = entry;

    // Color codes for different log levels
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m', // Reset
    };

    const color = colors[level] || colors.reset;
    const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset}`;

    const contextStr = context && Object.keys(context).length > 0
      ? `\n${JSON.stringify(context, null, 2)}`
      : '';

    const fullMessage = `${prefix} ${message}${contextStr}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage);
        break;
      case LogLevel.INFO:
        console.info(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage);
        break;
    }
  }
}

/**
 * JSON transport for production
 */
class JsonTransport implements LogTransport {
  name = 'json';

  log(entry: LogEntry): void {
    // Structured JSON logging for log aggregation services
    console.log(JSON.stringify(entry));
  }
}

/**
 * Browser console transport (simplified for client-side)
 */
class BrowserTransport implements LogTransport {
  name = 'browser';

  log(entry: LogEntry): void {
    const { level, message, context } = entry;

    // Simple console output for browser
    const method = level === LogLevel.DEBUG ? 'debug'
      : level === LogLevel.INFO ? 'info'
      : level === LogLevel.WARN ? 'warn'
      : 'error';

    if (context && Object.keys(context).length > 0) {
      console[method](message, context);
    } else {
      console[method](message);
    }
  }
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  enableTimestamps: boolean;
  enableContext: boolean;
}

/**
 * Main Logger class
 */
class Logger {
  private config: LoggerConfig;
  private defaultContext: LogContext = {};

  constructor(config?: Partial<LoggerConfig>) {
    // Default configuration based on environment
    const defaultTransport = typeof window === 'undefined'
      ? isProduction
        ? new JsonTransport()
        : new ConsoleTransport()
      : new BrowserTransport();

    this.config = {
      level: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
      transports: [defaultTransport],
      enableTimestamps: true,
      enableContext: true,
      ...config,
    };
  }

  /**
   * Set global context that will be included in all logs
   */
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Clear default context
   */
  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  /**
   * Get current default context
   */
  getDefaultContext(): LogContext {
    return { ...this.defaultContext };
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Format log entry
   */
  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.config.enableContext
        ? { ...this.defaultContext, ...context }
        : undefined,
      environment: env.NODE_ENV,
    };
  }

  /**
   * Write log to all transports
   */
  private async write(entry: LogEntry): Promise<void> {
    const promises = this.config.transports.map((transport) => {
      try {
        return Promise.resolve(transport.log(entry));
      } catch (error) {
        // Prevent transport errors from breaking the app
        console.error(`[Logger] Transport ${transport.name} failed:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.formatEntry(LogLevel.DEBUG, message, context);
    this.write(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.formatEntry(LogLevel.INFO, message, context);
    this.write(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.formatEntry(LogLevel.WARN, message, context);
    this.write(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    // Extract error information
    const errorContext: LogContext = { ...context };

    if (error) {
      if (error instanceof Error) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        };
      } else {
        errorContext.error = {
          message: String(error),
        };
      }
    }

    const entry = this.formatEntry(LogLevel.ERROR, message, errorContext);
    this.write(entry);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }

  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove a transport by name
   */
  removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(
      (transport) => transport.name !== name
    );
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create a child logger with context
 *
 * @param context - Context to attach to all logs
 * @returns Child logger instance
 */
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;
  private logger: Logger;

  constructor(label: string, loggerInstance?: Logger) {
    this.label = label;
    this.logger = loggerInstance || logger;
    this.startTime = Date.now();
  }

  /**
   * End timer and log duration
   */
  end(context?: LogContext): number {
    const duration = Date.now() - this.startTime;
    this.logger.debug(`${this.label} completed`, {
      ...context,
      duration,
      durationMs: `${duration}ms`,
    });
    return duration;
  }

  /**
   * Get current duration without logging
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Create a performance timer
 *
 * @param label - Timer label
 * @param loggerInstance - Optional logger instance
 * @returns PerformanceTimer instance
 */
export function startTimer(label: string, loggerInstance?: Logger): PerformanceTimer {
  return new PerformanceTimer(label, loggerInstance);
}

/**
 * Measure and log async function execution time
 *
 * @param label - Operation label
 * @param fn - Async function to measure
 * @param context - Additional context
 * @returns Function result
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const timer = startTimer(label);
  try {
    const result = await fn();
    timer.end(context);
    return result;
  } catch (error) {
    const duration = timer.getDuration();
    logger.error(`${label} failed`, error, { ...context, duration });
    throw error;
  }
}

/**
 * Export transport classes for custom implementations
 */
export { ConsoleTransport, JsonTransport, BrowserTransport };
