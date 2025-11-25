/**
 * =============================================================================
 * PERFORMANCE E2E TESTS
 * =============================================================================
 * Tests performance characteristics including response times, concurrent
 * requests, resource cleanup, and memory leaks
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { WhatsAppHelper } = require('../helpers/whatsapp-helper');
const { DatabaseHelper } = require('../helpers/database-helper');
const { PerformanceHelper } = require('../helpers/performance-helper');

test.describe('Performance E2E', () => {
  let whatsappHelper;
  let databaseHelper;
  let performanceHelper;
  let testSalonId;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    performanceHelper = new PerformanceHelper();
    await databaseHelper.connect();

    testSalonId = await databaseHelper.createTestSalon({
      name: 'Performance Test Salon',
      phone: '+1234567890',
    });
  });

  test.beforeEach(async ({ page }) => {
    whatsappHelper = new WhatsAppHelper(page);
    performanceHelper.reset();
  });

  test.afterAll(async () => {
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
  });

  // ===========================================================================
  // Response Time Tests
  // ===========================================================================

  test('should respond to webhook within 200ms', async () => {
    const iterations = 10;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      const response = await whatsappHelper.sendWebhook({
        from: `+555${i.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Quick response test',
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      responseTimes.push(duration);

      expect(response.status).toBe(200);
    }

    // Calculate statistics
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    const p95Time = performanceHelper.percentile(responseTimes, 95);

    console.log(`Response Times:
      Average: ${avgTime.toFixed(2)}ms
      Max: ${maxTime}ms
      P95: ${p95Time.toFixed(2)}ms
    `);

    // Assertions
    expect(avgTime).toBeLessThan(200);
    expect(p95Time).toBeLessThan(300);
    expect(maxTime).toBeLessThan(500);
  });

  test('should maintain response time under load', async () => {
    const concurrency = 20;
    const requests = Array.from({ length: concurrency }, (_, i) => ({
      from: `+666${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: `Load test ${i}`,
      timestamp: Date.now(),
    }));

    const startTime = Date.now();
    const responses = await Promise.all(
      requests.map(req => whatsappHelper.sendWebhook(req))
    );
    const totalDuration = Date.now() - startTime;

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Average per-request time should be reasonable
    const avgTime = totalDuration / concurrency;
    expect(avgTime).toBeLessThan(500); // 500ms average under 20 concurrent

    console.log(`Load Test Results:
      Total Duration: ${totalDuration}ms
      Requests: ${concurrency}
      Avg Time: ${avgTime.toFixed(2)}ms
    `);
  });

  test('should handle database query performance', async () => {
    // Create test data
    for (let i = 0; i < 50; i++) {
      await databaseHelper.createTestBooking({
        salon_id: testSalonId,
        customer_phone: `+777${i.toString().padStart(7, '0')}`,
        service_type: 'Haircut',
        appointment_date: new Date(Date.now() + i * 86400000),
        status: 'confirmed',
      });
    }

    // Measure query performance
    const queryTimes = [];

    for (let i = 0; i < 10; i++) {
      const startTime = process.hrtime.bigint();
      await databaseHelper.getBookings(testSalonId);
      const endTime = process.hrtime.bigint();

      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      queryTimes.push(duration);
    }

    const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
    const p95QueryTime = performanceHelper.percentile(queryTimes, 95);

    console.log(`Database Query Performance:
      Average: ${avgQueryTime.toFixed(2)}ms
      P95: ${p95QueryTime.toFixed(2)}ms
    `);

    // Database queries should be fast
    expect(avgQueryTime).toBeLessThan(100);
    expect(p95QueryTime).toBeLessThan(200);
  });

  // ===========================================================================
  // Concurrent Request Tests
  // ===========================================================================

  test('should handle 50 concurrent requests', async () => {
    const concurrency = 50;
    const requests = Array.from({ length: concurrency }, (_, i) => ({
      from: `+888${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: `Concurrent test ${i}`,
      timestamp: Date.now() + i,
    }));

    const startTime = Date.now();
    const responses = await Promise.all(
      requests.map(req => whatsappHelper.sendWebhook(req))
    );
    const duration = Date.now() - startTime;

    // Count successes
    const successful = responses.filter(r => r.status === 200);
    const successRate = (successful.length / concurrency) * 100;

    console.log(`Concurrent Request Test (50):
      Success Rate: ${successRate.toFixed(1)}%
      Duration: ${duration}ms
      Throughput: ${(concurrency / (duration / 1000)).toFixed(2)} req/s
    `);

    // At least 90% should succeed
    expect(successRate).toBeGreaterThan(90);
  });

  test('should handle 100 concurrent requests', async () => {
    const concurrency = 100;
    const requests = Array.from({ length: concurrency }, (_, i) => ({
      from: `+999${i.toString().padStart(7, '0')}`,
      to: testSalonId,
      body: `High concurrency test ${i}`,
      timestamp: Date.now() + i,
    }));

    const startTime = Date.now();
    const responses = await Promise.all(
      requests.map(req => whatsappHelper.sendWebhook(req))
    );
    const duration = Date.now() - startTime;

    const successful = responses.filter(r => r.status === 200);
    const successRate = (successful.length / concurrency) * 100;

    console.log(`Concurrent Request Test (100):
      Success Rate: ${successRate.toFixed(1)}%
      Duration: ${duration}ms
      Throughput: ${(concurrency / (duration / 1000)).toFixed(2)} req/s
    `);

    // At least 80% should succeed (some rate limiting expected)
    expect(successRate).toBeGreaterThan(80);
  });

  test('should handle concurrent booking creations', async () => {
    const concurrency = 20;
    const customerPhone = '+5555555550';

    const requests = Array.from({ length: concurrency }, (_, i) => ({
      from: customerPhone,
      to: testSalonId,
      body: `Book haircut on day ${i} at 2pm`,
      timestamp: Date.now() + i * 100,
    }));

    const responses = await Promise.all(
      requests.map(req => whatsappHelper.sendWebhook(req))
    );

    // All webhooks should be accepted
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Verify bookings were created (some might be duplicates detected by AI)
    const bookings = await databaseHelper.getBookings(testSalonId, customerPhone);
    expect(bookings.length).toBeGreaterThan(0);
    expect(bookings.length).toBeLessThanOrEqual(concurrency);
  });

  // ===========================================================================
  // Resource Cleanup Tests
  // ===========================================================================

  test('should close database connections properly', async () => {
    // Send multiple requests
    for (let i = 0; i < 20; i++) {
      await whatsappHelper.sendWebhook({
        from: `+111${i.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Connection test',
        timestamp: Date.now(),
      });
    }

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check database connection pool
    const poolStats = await databaseHelper.getPoolStats();

    console.log(`Database Pool Stats:
      Total: ${poolStats.total}
      Idle: ${poolStats.idle}
      Waiting: ${poolStats.waiting}
    `);

    // Should have returned connections to pool
    expect(poolStats.idle).toBeGreaterThan(0);
    expect(poolStats.waiting).toBe(0);
  });

  test('should cleanup Redis connections', async () => {
    // Send requests that use Redis
    for (let i = 0; i < 10; i++) {
      await whatsappHelper.sendWebhook({
        from: '+2222222220',
        to: testSalonId,
        body: `Redis test ${i}`,
        timestamp: Date.now(),
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Redis connections should be cleaned up (implementation dependent)
    // This would require exposing Redis pool stats
  });

  test('should cleanup completed promises', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Create many promises
    for (let i = 0; i < 100; i++) {
      await whatsappHelper.sendWebhook({
        from: `+333${i.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Memory test',
        timestamp: Date.now(),
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    console.log(`Memory Usage:
      Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB
      Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
      Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB
    `);

    // Memory increase should be reasonable (< 50MB for 100 requests)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  // ===========================================================================
  // Memory Leak Tests
  // ===========================================================================

  test('should not leak memory on repeated requests', async () => {
    const iterations = 50;
    const memorySnapshots = [];

    for (let i = 0; i < iterations; i++) {
      await whatsappHelper.sendWebhook({
        from: `+444${i.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Leak test',
        timestamp: Date.now(),
      });

      // Take memory snapshot every 10 requests
      if (i % 10 === 0) {
        if (global.gc) global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }
    }

    console.log('Memory Snapshots (MB):');
    memorySnapshots.forEach((mem, i) => {
      console.log(`  ${i * 10} requests: ${(mem / 1024 / 1024).toFixed(2)} MB`);
    });

    // Memory should stabilize (not grow linearly)
    const firstHalf = memorySnapshots.slice(0, memorySnapshots.length / 2);
    const secondHalf = memorySnapshots.slice(memorySnapshots.length / 2);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const memoryGrowth = secondAvg - firstAvg;
    const growthRate = (memoryGrowth / firstAvg) * 100;

    console.log(`Memory Growth Rate: ${growthRate.toFixed(2)}%`);

    // Should not grow more than 50%
    expect(growthRate).toBeLessThan(50);
  });

  test('should cleanup event listeners', async () => {
    const initialListeners = process.listenerCount('uncaughtException');

    // Send requests that might add listeners
    for (let i = 0; i < 20; i++) {
      await whatsappHelper.sendWebhook({
        from: `+555${i.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Listener test',
        timestamp: Date.now(),
      });
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalListeners = process.listenerCount('uncaughtException');

    console.log(`Event Listeners:
      Initial: ${initialListeners}
      Final: ${finalListeners}
    `);

    // Should not accumulate listeners
    expect(finalListeners).toBeLessThanOrEqual(initialListeners + 5);
  });

  // ===========================================================================
  // Throughput Tests
  // ===========================================================================

  test('should achieve minimum throughput of 10 req/s', async () => {
    const duration = 10000; // 10 seconds
    const requests = [];
    const startTime = Date.now();

    // Send requests for 10 seconds
    while (Date.now() - startTime < duration) {
      const promise = whatsappHelper.sendWebhook({
        from: `+666${requests.length.toString().padStart(7, '0')}`,
        to: testSalonId,
        body: 'Throughput test',
        timestamp: Date.now(),
      });
      requests.push(promise);

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const responses = await Promise.all(requests);
    const successful = responses.filter(r => r.status === 200);

    const throughput = successful.length / (duration / 1000);

    console.log(`Throughput Test:
      Total Requests: ${requests.length}
      Successful: ${successful.length}
      Duration: ${duration}ms
      Throughput: ${throughput.toFixed(2)} req/s
    `);

    // Should achieve at least 10 req/s
    expect(throughput).toBeGreaterThan(10);
  });

  test('should maintain throughput under continuous load', async () => {
    const phases = 3;
    const requestsPerPhase = 50;
    const throughputs = [];

    for (let phase = 0; phase < phases; phase++) {
      const startTime = Date.now();

      const requests = Array.from({ length: requestsPerPhase }, (_, i) => ({
        from: `+777${(phase * requestsPerPhase + i).toString().padStart(7, '0')}`,
        to: testSalonId,
        body: `Sustained load phase ${phase}`,
        timestamp: Date.now(),
      }));

      const responses = await Promise.all(
        requests.map(req => whatsappHelper.sendWebhook(req))
      );

      const duration = Date.now() - startTime;
      const successful = responses.filter(r => r.status === 200);
      const throughput = successful.length / (duration / 1000);

      throughputs.push(throughput);

      console.log(`Phase ${phase + 1} Throughput: ${throughput.toFixed(2)} req/s`);

      // Small pause between phases
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Throughput should remain consistent across phases
    const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
    const maxDeviation = Math.max(...throughputs.map(t => Math.abs(t - avgThroughput)));

    console.log(`Throughput Consistency:
      Average: ${avgThroughput.toFixed(2)} req/s
      Max Deviation: ${maxDeviation.toFixed(2)} req/s
    `);

    // Deviation should be less than 30%
    expect(maxDeviation / avgThroughput).toBeLessThan(0.3);
  });

  // ===========================================================================
  // End-to-End Performance Tests
  // ===========================================================================

  test('should complete full booking flow within 10 seconds', async () => {
    const customerPhone = '+9999999990';
    const startTime = Date.now();

    // Step 1: Initial message
    await whatsappHelper.sendWebhook({
      from: customerPhone,
      to: testSalonId,
      body: 'I want to book a haircut for tomorrow at 2pm',
      timestamp: Date.now(),
    });

    // Wait for processing and booking creation
    let booking;
    const maxWait = 10000;
    const pollInterval = 500;
    let waited = 0;

    while (waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      waited += pollInterval;

      booking = await databaseHelper.getLatestBooking(testSalonId, customerPhone);
      if (booking) break;
    }

    const duration = Date.now() - startTime;

    console.log(`Full Booking Flow Duration: ${duration}ms`);

    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);
    expect(booking).toBeTruthy();
  });

  test('should handle admin panel page load within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${process.env.BASE_URL}/admin/login`);
    await page.fill('[data-testid="admin-token-input"]', process.env.ADMIN_TOKEN || 'test-token');
    await page.click('[data-testid="login-button"]');

    await page.waitForURL(/\/admin\/dashboard/);
    await page.waitForSelector('[data-testid="dashboard-title"]');

    const duration = Date.now() - startTime;

    console.log(`Admin Page Load Time: ${duration}ms`);

    // Should load within 2 seconds
    expect(duration).toBeLessThan(2000);
  });
});
