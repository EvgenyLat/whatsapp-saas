/**
 * =============================================================================
 * PERFORMANCE HELPER
 * =============================================================================
 * Helper functions for performance measurement and analysis
 * =============================================================================
 */

class PerformanceHelper {
  constructor() {
    this.measurements = {};
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.measurements = {};
  }

  /**
   * Start a performance measurement
   */
  start(label) {
    this.measurements[label] = {
      startTime: process.hrtime.bigint(),
      endTime: null,
      duration: null,
    };
  }

  /**
   * End a performance measurement
   */
  end(label) {
    if (!this.measurements[label]) {
      throw new Error(`No measurement started for label: ${label}`);
    }

    this.measurements[label].endTime = process.hrtime.bigint();
    this.measurements[label].duration =
      Number(this.measurements[label].endTime - this.measurements[label].startTime) / 1000000; // Convert to ms

    return this.measurements[label].duration;
  }

  /**
   * Get duration for a measurement
   */
  getDuration(label) {
    if (!this.measurements[label] || this.measurements[label].duration === null) {
      return null;
    }
    return this.measurements[label].duration;
  }

  /**
   * Calculate percentile from array of numbers
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate average
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate median
   */
  median(arr) {
    return this.percentile(arr, 50);
  }

  /**
   * Calculate min
   */
  min(arr) {
    if (arr.length === 0) return 0;
    return Math.min(...arr);
  }

  /**
   * Calculate max
   */
  max(arr) {
    if (arr.length === 0) return 0;
    return Math.max(...arr);
  }

  /**
   * Calculate standard deviation
   */
  stdDev(arr) {
    if (arr.length === 0) return 0;

    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get statistics for an array of measurements
   */
  getStats(arr) {
    return {
      count: arr.length,
      min: this.min(arr),
      max: this.max(arr),
      avg: this.average(arr),
      median: this.median(arr),
      p50: this.percentile(arr, 50),
      p95: this.percentile(arr, 95),
      p99: this.percentile(arr, 99),
      stdDev: this.stdDev(arr),
    };
  }

  /**
   * Format bytes to human-readable
   */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Format duration to human-readable
   */
  formatDuration(ms) {
    if (ms < 1) return `${(ms * 1000).toFixed(2)} μs`;
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
    return `${(ms / 60000).toFixed(2)} min`;
  }

  /**
   * Measure async function execution time
   */
  async measure(label, fn) {
    this.start(label);
    const result = await fn();
    const duration = this.end(label);

    return {
      result,
      duration,
    };
  }

  /**
   * Measure multiple iterations
   */
  async measureIterations(label, fn, iterations = 10) {
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const iterLabel = `${label}_${i}`;
      this.start(iterLabel);
      await fn();
      const duration = this.end(iterLabel);
      durations.push(duration);
    }

    return this.getStats(durations);
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();

    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      formatted: {
        rss: this.formatBytes(usage.rss),
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external),
      },
    };
  }

  /**
   * Create a performance report
   */
  createReport(measurements) {
    const stats = this.getStats(measurements);
    const memory = this.getMemoryUsage();

    return {
      performance: {
        count: stats.count,
        min: this.formatDuration(stats.min),
        max: this.formatDuration(stats.max),
        avg: this.formatDuration(stats.avg),
        median: this.formatDuration(stats.median),
        p95: this.formatDuration(stats.p95),
        p99: this.formatDuration(stats.p99),
        stdDev: this.formatDuration(stats.stdDev),
      },
      memory: memory.formatted,
      raw: {
        performance: stats,
        memory: memory,
      },
    };
  }
}

module.exports = { PerformanceHelper };
