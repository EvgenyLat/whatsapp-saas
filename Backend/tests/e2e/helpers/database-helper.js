/**
 * =============================================================================
 * DATABASE HELPER
 * =============================================================================
 * Helper functions for database operations in E2E tests
 * =============================================================================
 */

const { Pool } = require('pg');

class DatabaseHelper {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'whatsapp_saas_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
    };
  }

  async connect() {
    if (!this.pool) {
      this.pool = new Pool(this.config);
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // ============================================================================
  // Salon Operations
  // ============================================================================

  async createTestSalon(data) {
    const result = await this.pool.query(
      `INSERT INTO salons (id, name, phone, email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [
        data.id || `salon_test_${Date.now()}`,
        data.name,
        data.phone,
        data.email || `test_${Date.now()}@example.com`,
      ]
    );
    return result.rows[0].id;
  }

  async getSalon(salonId) {
    const result = await this.pool.query('SELECT * FROM salons WHERE id = $1', [salonId]);
    return result.rows[0];
  }

  // ============================================================================
  // Booking Operations
  // ============================================================================

  async createTestBooking(data) {
    const result = await this.pool.query(
      `INSERT INTO bookings (
        salon_id, customer_phone, customer_name, service_type,
        appointment_date, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        data.salon_id,
        data.customer_phone,
        data.customer_name || 'Test Customer',
        data.service_type,
        data.appointment_date,
        data.status || 'pending',
        data.notes || null,
      ]
    );
    return result.rows[0];
  }

  async getBookingById(bookingId) {
    const result = await this.pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    return result.rows[0];
  }

  async getLatestBooking(salonId, customerPhone) {
    const result = await this.pool.query(
      `SELECT * FROM bookings
       WHERE salon_id = $1 AND customer_phone = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [salonId, customerPhone]
    );
    return result.rows[0];
  }

  async getBookings(salonId, customerPhone = null) {
    if (customerPhone) {
      const result = await this.pool.query(
        `SELECT * FROM bookings
         WHERE salon_id = $1 AND customer_phone = $2
         ORDER BY created_at DESC`,
        [salonId, customerPhone]
      );
      return result.rows;
    } else {
      const result = await this.pool.query(
        `SELECT * FROM bookings
         WHERE salon_id = $1
         ORDER BY created_at DESC`,
        [salonId]
      );
      return result.rows;
    }
  }

  async getBookingCountByStatus(salonId, status) {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM bookings
       WHERE salon_id = $1 AND status = $2`,
      [salonId, status]
    );
    return parseInt(result.rows[0].count);
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async createTestMessage(data) {
    const result = await this.pool.query(
      `INSERT INTO messages (
        salon_id, customer_phone, conversation_id, body, direction,
        status, media_type, media_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        data.salon_id,
        data.customer_phone,
        data.conversation_id || null,
        data.body,
        data.direction,
        data.status || 'sent',
        data.media_type || null,
        data.media_id || null,
      ]
    );
    return result.rows[0];
  }

  async getMessageById(messageId) {
    const result = await this.pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
    return result.rows[0];
  }

  async getLatestMessage(customerPhone, salonId) {
    const result = await this.pool.query(
      `SELECT * FROM messages
       WHERE customer_phone = $1 AND salon_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerPhone, salonId]
    );
    return result.rows[0];
  }

  async getLatestOutgoingMessage(customerPhone, salonId) {
    const result = await this.pool.query(
      `SELECT * FROM messages
       WHERE customer_phone = $1 AND salon_id = $2 AND direction = 'outgoing'
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerPhone, salonId]
    );
    return result.rows[0];
  }

  async getConfirmationMessage(customerPhone, salonId, bookingId) {
    const result = await this.pool.query(
      `SELECT * FROM messages
       WHERE customer_phone = $1 AND salon_id = $2 AND direction = 'outgoing'
       AND body LIKE $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerPhone, salonId, `%${bookingId}%`]
    );
    return result.rows[0];
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  async getConversation(customerPhone, salonId) {
    const result = await this.pool.query(
      `SELECT * FROM conversations
       WHERE customer_phone = $1 AND salon_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [customerPhone, salonId]
    );
    return result.rows[0];
  }

  async clearConversation(customerPhone, salonId) {
    await this.pool.query(
      `DELETE FROM messages WHERE customer_phone = $1 AND salon_id = $2`,
      [customerPhone, salonId]
    );
    await this.pool.query(
      `DELETE FROM conversations WHERE customer_phone = $1 AND salon_id = $2`,
      [customerPhone, salonId]
    );
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  async cleanupTestData(salonId) {
    // Delete in order of foreign key dependencies
    await this.pool.query('DELETE FROM messages WHERE salon_id = $1', [salonId]);
    await this.pool.query('DELETE FROM bookings WHERE salon_id = $1', [salonId]);
    await this.pool.query('DELETE FROM conversations WHERE salon_id = $1', [salonId]);
    await this.pool.query('DELETE FROM salons WHERE id = $1', [salonId]);
  }

  async cleanupAllTestData() {
    await this.pool.query("DELETE FROM messages WHERE salon_id LIKE 'salon_test_%'");
    await this.pool.query("DELETE FROM bookings WHERE salon_id LIKE 'salon_test_%'");
    await this.pool.query("DELETE FROM conversations WHERE salon_id LIKE 'salon_test_%'");
    await this.pool.query("DELETE FROM salons WHERE id LIKE 'salon_test_%'");
  }

  // ============================================================================
  // Database Stats
  // ============================================================================

  async getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  async getTableRowCount(tableName) {
    const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  // ============================================================================
  // Raw Query
  // ============================================================================

  async query(sql, params = []) {
    return await this.pool.query(sql, params);
  }
}

module.exports = { DatabaseHelper };
