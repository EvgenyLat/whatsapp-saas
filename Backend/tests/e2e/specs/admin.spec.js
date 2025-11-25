/**
 * =============================================================================
 * ADMIN OPERATIONS E2E TESTS
 * =============================================================================
 * Tests admin panel operations including authentication, data viewing, filtering
 * =============================================================================
 */

const { test, expect } = require('@playwright/test');
const { AdminHelper } = require('../helpers/admin-helper');
const { DatabaseHelper } = require('../helpers/database-helper');

test.describe('Admin Operations E2E', () => {
  let adminHelper;
  let databaseHelper;
  let testSalonId;
  let adminPage;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    await databaseHelper.connect();

    // Create test salon with sample data
    testSalonId = await databaseHelper.createTestSalon({
      name: 'Admin Test Salon',
      phone: '+1234567890',
    });

    // Create sample bookings
    await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: '+1111111111',
      service_type: 'Haircut',
      status: 'confirmed',
      appointment_date: new Date(Date.now() + 86400000), // Tomorrow
    });

    await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: '+2222222222',
      service_type: 'Manicure',
      status: 'pending',
      appointment_date: new Date(Date.now() + 172800000), // Day after tomorrow
    });

    await databaseHelper.createTestBooking({
      salon_id: testSalonId,
      customer_phone: '+3333333333',
      service_type: 'Haircut',
      status: 'cancelled',
      appointment_date: new Date(Date.now() - 86400000), // Yesterday
    });

    // Create sample messages
    await databaseHelper.createTestMessage({
      salon_id: testSalonId,
      customer_phone: '+1111111111',
      body: 'Hello, I want to book a haircut',
      direction: 'incoming',
    });

    await databaseHelper.createTestMessage({
      salon_id: testSalonId,
      customer_phone: '+1111111111',
      body: 'Your booking is confirmed for tomorrow at 2pm',
      direction: 'outgoing',
    });
  });

  test.beforeEach(async ({ page }) => {
    adminHelper = new AdminHelper(page);
    adminPage = page;
  });

  test.afterAll(async () => {
    await databaseHelper.cleanupTestData(testSalonId);
    await databaseHelper.disconnect();
  });

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  test('should login to admin panel successfully', async ({ page }) => {
    await adminHelper.navigateToLogin();

    // Fill login form
    await page.fill('[data-testid="admin-token-input"]', process.env.ADMIN_TOKEN || 'test-admin-token');
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/admin\/dashboard/);

    // Verify dashboard loaded
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should reject invalid admin token', async ({ page }) => {
    await adminHelper.navigateToLogin();

    // Fill with invalid token
    await page.fill('[data-testid="admin-token-input"]', 'invalid-token-12345');
    await page.click('[data-testid="login-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');

    // Verify still on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    await adminHelper.login(page);

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Verify redirected to login
    await page.waitForURL(/\/admin\/login/);
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  // ===========================================================================
  // Bookings List Tests
  // ===========================================================================

  test('should view bookings list', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Wait for bookings to load
    await page.waitForSelector('[data-testid="bookings-table"]');

    // Verify table has data
    const rows = await page.locator('[data-testid="booking-row"]').count();
    expect(rows).toBeGreaterThan(0);

    // Verify table headers
    await expect(page.locator('th:has-text("Customer")')).toBeVisible();
    await expect(page.locator('th:has-text("Service")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should filter bookings by status', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Select "confirmed" status filter
    await page.selectOption('[data-testid="status-filter"]', 'confirmed');
    await page.click('[data-testid="apply-filter-button"]');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify all visible bookings have "confirmed" status
    const statusCells = await page.locator('[data-testid="booking-status"]').allTextContents();
    statusCells.forEach(status => {
      expect(status.toLowerCase()).toContain('confirmed');
    });

    // Verify count
    const confirmedCount = statusCells.length;
    expect(confirmedCount).toBeGreaterThan(0);
  });

  test('should filter bookings by date range', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Set date range (today to 7 days from now)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    await page.fill('[data-testid="date-from"]', today);
    await page.fill('[data-testid="date-to"]', nextWeek);
    await page.click('[data-testid="apply-filter-button"]');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify all bookings are within date range
    const dateCells = await page.locator('[data-testid="booking-date"]').allTextContents();
    expect(dateCells.length).toBeGreaterThan(0);

    // All dates should be in the future
    dateCells.forEach(dateText => {
      const bookingDate = new Date(dateText);
      expect(bookingDate.getTime()).toBeGreaterThan(Date.now() - 86400000); // Allow for yesterday
    });
  });

  test('should search bookings by customer phone', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Search for specific customer
    await page.fill('[data-testid="search-input"]', '+1111111111');
    await page.click('[data-testid="search-button"]');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Verify only matching customer appears
    const phoneNumbers = await page.locator('[data-testid="booking-phone"]').allTextContents();
    phoneNumbers.forEach(phone => {
      expect(phone).toContain('1111111111');
    });
  });

  test('should paginate bookings list', async ({ page }) => {
    // Create more bookings to test pagination
    for (let i = 0; i < 25; i++) {
      await databaseHelper.createTestBooking({
        salon_id: testSalonId,
        customer_phone: `+555${i.toString().padStart(7, '0')}`,
        service_type: 'Test Service',
        status: 'confirmed',
        appointment_date: new Date(Date.now() + 86400000),
      });
    }

    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Verify first page
    const firstPageRows = await page.locator('[data-testid="booking-row"]').count();
    expect(firstPageRows).toBeLessThanOrEqual(20); // Default page size

    // Click next page
    await page.click('[data-testid="next-page-button"]');
    await page.waitForTimeout(1000);

    // Verify second page loaded
    const secondPageRows = await page.locator('[data-testid="booking-row"]').count();
    expect(secondPageRows).toBeGreaterThan(0);

    // Verify page indicator changed
    await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
  });

  // ===========================================================================
  // Stats and Analytics Tests
  // ===========================================================================

  test('should view statistics dashboard', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToStats(testSalonId);

    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmed-bookings"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-bookings"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancelled-bookings"]')).toBeVisible();

    // Verify numbers are present
    const totalBookings = await page.locator('[data-testid="total-bookings"]').textContent();
    expect(parseInt(totalBookings)).toBeGreaterThan(0);
  });

  test('should view analytics with date range', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToAnalytics(testSalonId);

    // Set date range (last 30 days)
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    await page.fill('[data-testid="analytics-date-from"]', thirtyDaysAgo);
    await page.fill('[data-testid="analytics-date-to"]', today);
    await page.click('[data-testid="apply-analytics-filter"]');

    // Wait for charts to load
    await page.waitForTimeout(2000);

    // Verify charts are visible
    await expect(page.locator('[data-testid="bookings-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('should check analytics data accuracy', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToStats(testSalonId);

    // Get stats from UI
    const confirmedText = await page.locator('[data-testid="confirmed-bookings"]').textContent();
    const confirmedUI = parseInt(confirmedText);

    // Get stats from database
    const confirmedDB = await databaseHelper.getBookingCountByStatus(testSalonId, 'confirmed');

    // Verify they match
    expect(confirmedUI).toBe(confirmedDB);
  });

  // ===========================================================================
  // Export Data Tests
  // ===========================================================================

  test('should export bookings as CSV', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-button"]'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/bookings.*\.csv/);

    // Save and verify file content
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');

    // Verify CSV headers
    expect(content).toContain('Customer Phone');
    expect(content).toContain('Service Type');
    expect(content).toContain('Appointment Date');
    expect(content).toContain('Status');

    // Verify data rows
    const lines = content.split('\n');
    expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
  });

  test('should export analytics as JSON', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToAnalytics(testSalonId);

    // Click export JSON button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-json-button"]'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/analytics.*\.json/);

    // Save and verify file content
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');
    const data = JSON.parse(content);

    // Verify JSON structure
    expect(data).toHaveProperty('salon_id');
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('date_range');
  });

  // ===========================================================================
  // Booking Details Tests
  // ===========================================================================

  test('should view booking details', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Click first booking
    await page.click('[data-testid="booking-row"]:first-child');

    // Wait for details modal/page
    await page.waitForSelector('[data-testid="booking-details"]');

    // Verify all booking information is displayed
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-customer-phone"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-service"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-created-at"]')).toBeVisible();
  });

  test('should update booking status', async ({ page }) => {
    await adminHelper.login(page);
    await adminHelper.navigateToBookings(testSalonId);

    // Click first pending booking
    await page.click('[data-testid="booking-row"]:has([data-testid="booking-status"]:has-text("pending")):first-child');

    // Wait for details
    await page.waitForSelector('[data-testid="booking-details"]');

    // Get booking ID
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent();

    // Update status to confirmed
    await page.selectOption('[data-testid="status-select"]', 'confirmed');
    await page.click('[data-testid="save-booking-button"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Verify in database
    const booking = await databaseHelper.getBookingById(bookingId);
    expect(booking.status).toBe('confirmed');
  });
});
