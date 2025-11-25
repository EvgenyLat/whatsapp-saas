/**
 * =============================================================================
 * ADMIN HELPER
 * =============================================================================
 * Helper functions for admin panel interactions in E2E tests
 * =============================================================================
 */

class AdminHelper {
  constructor(page) {
    this.page = page;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    this.adminToken = process.env.ADMIN_TOKEN || 'test-admin-token';
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin() {
    await this.page.goto(`${this.baseUrl}/admin/login`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login to admin panel
   */
  async login(page) {
    await this.navigateToLogin();
    await page.fill('[data-testid="admin-token-input"]', this.adminToken);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/admin\/dashboard/);
    await page.waitForSelector('[data-testid="dashboard-title"]');
  }

  /**
   * Navigate to bookings page
   */
  async navigateToBookings(salonId) {
    await this.page.goto(`${this.baseUrl}/admin/bookings/${salonId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to stats page
   */
  async navigateToStats(salonId) {
    await this.page.goto(`${this.baseUrl}/admin/stats/${salonId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to analytics page
   */
  async navigateToAnalytics(salonId) {
    await this.page.goto(`${this.baseUrl}/admin/analytics/${salonId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to messages page
   */
  async navigateToMessages(salonId) {
    await this.page.goto(`${this.baseUrl}/admin/messages/${salonId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter bookings by status
   */
  async filterByStatus(status) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await this.page.click('[data-testid="apply-filter-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter bookings by date range
   */
  async filterByDateRange(startDate, endDate) {
    await this.page.fill('[data-testid="date-from"]', startDate);
    await this.page.fill('[data-testid="date-to"]', endDate);
    await this.page.click('[data-testid="apply-filter-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search bookings
   */
  async search(query) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.click('[data-testid="search-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get booking count from table
   */
  async getBookingCount() {
    const rows = await this.page.locator('[data-testid="booking-row"]');
    return await rows.count();
  }

  /**
   * Click on a booking row
   */
  async clickBooking(index = 0) {
    const rows = await this.page.locator('[data-testid="booking-row"]');
    await rows.nth(index).click();
    await this.page.waitForSelector('[data-testid="booking-details"]');
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(newStatus) {
    await this.page.selectOption('[data-testid="status-select"]', newStatus);
    await this.page.click('[data-testid="save-booking-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  /**
   * Export data
   */
  async exportCSV() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click('[data-testid="export-csv-button"]'),
    ]);
    return download;
  }

  /**
   * Get stats from dashboard
   */
  async getStats() {
    const stats = {};

    const totalBookings = await this.page.locator('[data-testid="total-bookings"]').textContent();
    const confirmedBookings = await this.page.locator('[data-testid="confirmed-bookings"]').textContent();
    const pendingBookings = await this.page.locator('[data-testid="pending-bookings"]').textContent();
    const cancelledBookings = await this.page.locator('[data-testid="cancelled-bookings"]').textContent();

    stats.total = parseInt(totalBookings);
    stats.confirmed = parseInt(confirmedBookings);
    stats.pending = parseInt(pendingBookings);
    stats.cancelled = parseInt(cancelledBookings);

    return stats;
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL(/\/admin\/login/);
  }
}

module.exports = { AdminHelper };
