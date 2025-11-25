/**
 * =============================================================================
 * OWASP A03:2021 - INJECTION TESTS
 * =============================================================================
 *
 * Tests for SQL, NoSQL, Command, LDAP, and other injection vulnerabilities.
 */

const request = require('supertest');
const { app } = require('../../../src/app');
const fixtures = require('../fixtures/security.fixtures');
const helpers = require('../helpers/security-helpers');

describe('OWASP A03:2021 - Injection', () => {
  let testData, validToken;

  beforeAll(async () => {
    testData = await fixtures.setupSecurityTest();
    validToken = testData.validToken;
  });

  afterAll(async () => {
    await fixtures.cleanupSecurityTest(testData);
  });

  describe('SQL Injection', () => {
    const sqlPayloads = helpers.getSQLInjectionPayloads();

    it('should prevent SQL injection in search parameters', async () => {
      for (const payload of sqlPayloads) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });

    it('should use parameterized queries', async () => {
      const response = await request(app)
        .post(`/admin/bookings/${testData.salon.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          customer_name: "O'Brien",
          customer_phone: '+1234567890',
          service: 'Haircut',
          datetime: new Date().toISOString(),
        })
        .expect(201);
    });

    it('should sanitize ORDER BY clauses', async () => {
      const response = await request(app)
        .get(`/admin/bookings/${testData.salon.id}`)
        .query({ sort: "id; DROP TABLE bookings--" })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });

  describe('NoSQL Injection', () => {
    it('should prevent NoSQL injection in filters', async () => {
      const nosqlPayloads = [
        { $gt: '' },
        { $ne: null },
        { $where: 'this.password == "password"' },
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .get(`/admin/bookings/${testData.salon.id}`)
          .query({ filter: JSON.stringify(payload) })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });
  });

  describe('Command Injection', () => {
    const cmdPayloads = helpers.getCommandInjectionPayloads();

    it('should prevent command injection in file operations', async () => {
      for (const payload of cmdPayloads) {
        const response = await request(app)
          .post('/admin/upload')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from('test'), payload)
          .expect(400);
      }
    });
  });

  describe('LDAP Injection', () => {
    it('should prevent LDAP injection in search', async () => {
      const ldapPayloads = ['*', '*)(&', '*()|&'];

      for (const payload of ldapPayloads) {
        await request(app)
          .get('/admin/users')
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);
      }
    });
  });
});
