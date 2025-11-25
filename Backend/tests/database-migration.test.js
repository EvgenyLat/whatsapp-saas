'use strict';

/**
 * Database Migration Tests
 *
 * Tests to verify the migration from JSON file storage to PostgreSQL
 * is working correctly and maintains backward compatibility.
 *
 * Run with: npm test -- database-migration.test.js
 */

const { PrismaClient } = require('@prisma/client');
const salons = require('../src/salons');
const bookings = require('../src/bookings');

const prisma = new PrismaClient();

// Test data
const testSalon = {
	phone_number_id: '123456789',
	access_token: 'test_token_123',
	name: 'Test Salon'
};

const testSalon2 = {
	phone_number_id: '987654321',
	access_token: 'test_token_456',
	name: 'Test Salon 2'
};

// Helper to clean up test data
async function cleanupTestData() {
	// Delete test bookings
	await prisma.booking.deleteMany({
		where: {
			OR: [
				{ customer_phone: { contains: 'test_' } },
				{ customer_name: { contains: 'Test' } }
			]
		}
	});

	// Delete test salons
	await prisma.salon.deleteMany({
		where: {
			phone_number_id: {
				in: [testSalon.phone_number_id, testSalon2.phone_number_id]
			}
		}
	});
}

describe('Database Migration - Salon Operations', () => {
	beforeAll(async () => {
		await cleanupTestData();
	});

	afterAll(async () => {
		await cleanupTestData();
		await prisma.$disconnect();
	});

	describe('salons.upsert()', () => {
		test('should create a new salon', async () => {
			const result = await salons.upsert(testSalon);

			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
			expect(result.phone_number_id).toBe(testSalon.phone_number_id);
			expect(result.access_token).toBe(testSalon.access_token);
			expect(result.name).toBe(testSalon.name);
			expect(result.created_at).toBeDefined();
			expect(result.updated_at).toBeDefined();
		});

		test('should update an existing salon', async () => {
			// Create salon
			const created = await salons.upsert(testSalon);

			// Update salon
			const updated = await salons.upsert({
				phone_number_id: testSalon.phone_number_id,
				access_token: 'updated_token',
				name: 'Updated Salon'
			});

			expect(updated.id).toBe(created.id);
			expect(updated.phone_number_id).toBe(testSalon.phone_number_id);
			expect(updated.access_token).toBe('updated_token');
			expect(updated.name).toBe('Updated Salon');
		});

		test('should throw error for invalid salon data', async () => {
			await expect(salons.upsert(null)).rejects.toThrow();
			await expect(salons.upsert({})).rejects.toThrow();
			await expect(salons.upsert({ phone_number_id: '123' })).rejects.toThrow();
			await expect(salons.upsert({ access_token: 'token' })).rejects.toThrow();
		});

		test('should handle salon with default name', async () => {
			const result = await salons.upsert({
				phone_number_id: testSalon2.phone_number_id,
				access_token: testSalon2.access_token
			});

			expect(result.name).toBe('Salon');
		});
	});

	describe('salons.getByPhoneNumberId()', () => {
		beforeAll(async () => {
			await salons.upsert(testSalon);
		});

		test('should retrieve existing salon', async () => {
			const result = await salons.getByPhoneNumberId(testSalon.phone_number_id);

			expect(result).toBeDefined();
			expect(result.phone_number_id).toBe(testSalon.phone_number_id);
			expect(result.name).toBeDefined();
		});

		test('should return null for non-existent salon', async () => {
			const result = await salons.getByPhoneNumberId('non_existent_id');

			expect(result).toBeNull();
		});

		test('should return null for empty phone number', async () => {
			const result = await salons.getByPhoneNumberId('');

			expect(result).toBeNull();
		});

		test('should fallback to environment variables', async () => {
			// Save original env
			const originalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
			const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;

			// Set test env
			process.env.WHATSAPP_PHONE_NUMBER_ID = 'env_test_123';
			process.env.WHATSAPP_ACCESS_TOKEN = 'env_token_123';

			const result = await salons.getByPhoneNumberId('env_test_123');

			expect(result).toBeDefined();
			expect(result.phone_number_id).toBe('env_test_123');

			// Restore env
			process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneId;
			process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
		});
	});
});

describe('Database Migration - Booking Operations', () => {
	let testSalonId;

	beforeAll(async () => {
		await cleanupTestData();

		// Create test salon
		const salon = await salons.upsert(testSalon);
		testSalonId = salon.id;
	});

	afterAll(async () => {
		await cleanupTestData();
		await prisma.$disconnect();
	});

	describe('bookings.tryCreateBookingFromParsed()', () => {
		test('should create a valid booking', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const dateStr = tomorrow.toISOString().split('T')[0];

			const parsed = {
				date: dateStr,
				time: '14:00',
				name: 'Test Customer',
				service: 'Test Service'
			};

			const result = await bookings.tryCreateBookingFromParsed(
				parsed,
				'test_customer_phone',
				testSalonId
			);

			expect(result.ok).toBe(true);
			expect(result.booking).toBeDefined();
			expect(result.booking.booking_code).toBeDefined();
			expect(result.booking.customer_name).toBe('Test Customer');
			expect(result.booking.service).toBe('Test Service');
			expect(result.booking.status).toBe('confirmed');
			expect(result.booking.summary).toBeDefined();
		});

		test('should reject booking in the past', async () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const dateStr = yesterday.toISOString().split('T')[0];

			const parsed = {
				date: dateStr,
				time: '14:00',
				name: 'Test Customer',
				service: 'Test Service'
			};

			const result = await bookings.tryCreateBookingFromParsed(
				parsed,
				'test_customer_phone_2',
				testSalonId
			);

			expect(result.ok).toBe(false);
			expect(result.reason).toBe('past_datetime');
		});

		test('should detect booking conflicts', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 2);
			const dateStr = tomorrow.toISOString().split('T')[0];

			const parsed = {
				date: dateStr,
				time: '15:00',
				name: 'Test Customer 1',
				service: 'Test Service'
			};

			// Create first booking
			const result1 = await bookings.tryCreateBookingFromParsed(
				parsed,
				'test_customer_phone_3',
				testSalonId
			);
			expect(result1.ok).toBe(true);

			// Try to create conflicting booking
			const result2 = await bookings.tryCreateBookingFromParsed(
				parsed,
				'test_customer_phone_4',
				testSalonId
			);

			expect(result2.ok).toBe(false);
			expect(result2.reason).toBe('busy');
			expect(result2.alternatives).toBeDefined();
			expect(result2.alternatives.length).toBeGreaterThan(0);
		});

		test('should handle invalid input data', async () => {
			const result1 = await bookings.tryCreateBookingFromParsed(
				null,
				'test_phone',
				testSalonId
			);
			expect(result1.ok).toBe(false);
			expect(result1.reason).toBe('invalid_parsed_data');

			const result2 = await bookings.tryCreateBookingFromParsed(
				{ date: '2025-01-20', time: '10:00' },
				'',
				testSalonId
			);
			expect(result2.ok).toBe(false);
			expect(result2.reason).toBe('invalid_phone_number');

			const result3 = await bookings.tryCreateBookingFromParsed(
				{ date: 'invalid', time: '10:00' },
				'test_phone',
				testSalonId
			);
			expect(result3.ok).toBe(false);
			expect(result3.reason).toBe('invalid_datetime');
		});

		test('should use default values for missing optional fields', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 3);
			const dateStr = tomorrow.toISOString().split('T')[0];

			const parsed = {
				date: dateStr,
				time: '16:00'
			};

			const result = await bookings.tryCreateBookingFromParsed(
				parsed,
				'test_customer_phone_5',
				testSalonId
			);

			expect(result.ok).toBe(true);
			expect(result.booking.customer_name).toBe('Клиент');
			expect(result.booking.service).toBe('услуга');
		});
	});

	describe('bookings.cancelByCode()', () => {
		let bookingCode;
		const customerPhone = 'test_customer_phone_6';

		beforeAll(async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 4);
			const dateStr = tomorrow.toISOString().split('T')[0];

			const result = await bookings.tryCreateBookingFromParsed(
				{
					date: dateStr,
					time: '17:00',
					name: 'Test Customer for Cancel',
					service: 'Test Service'
				},
				customerPhone,
				testSalonId
			);

			bookingCode = result.booking.booking_code;
		});

		test('should cancel an existing booking', async () => {
			const result = await bookings.cancelByCode(
				bookingCode,
				customerPhone,
				testSalonId
			);

			expect(result).toBe(true);

			// Verify booking is cancelled
			const booking = await prisma.booking.findUnique({
				where: {
					booking_code_salon_id: {
						booking_code: bookingCode,
						salon_id: testSalonId
					}
				}
			});

			expect(booking.status).toBe('CANCELLED');
		});

		test('should return false for non-existent booking', async () => {
			const result = await bookings.cancelByCode(
				'NONEXIST',
				customerPhone,
				testSalonId
			);

			expect(result).toBe(false);
		});

		test('should return false for wrong customer phone', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 5);
			const dateStr = tomorrow.toISOString().split('T')[0];

			const created = await bookings.tryCreateBookingFromParsed(
				{
					date: dateStr,
					time: '18:00',
					name: 'Test Customer',
					service: 'Test Service'
				},
				'test_customer_phone_7',
				testSalonId
			);

			const result = await bookings.cancelByCode(
				created.booking.booking_code,
				'wrong_phone',
				testSalonId
			);

			expect(result).toBe(false);
		});
	});

	describe('bookings.loadForSalon()', () => {
		beforeAll(async () => {
			// Create multiple bookings
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 6);
			const dateStr = tomorrow.toISOString().split('T')[0];

			await bookings.tryCreateBookingFromParsed(
				{ date: dateStr, time: '10:00', name: 'Customer 1', service: 'Service 1' },
				'test_customer_phone_8',
				testSalonId
			);

			await bookings.tryCreateBookingFromParsed(
				{ date: dateStr, time: '11:00', name: 'Customer 2', service: 'Service 2' },
				'test_customer_phone_9',
				testSalonId
			);
		});

		test('should load all bookings for a salon', async () => {
			const result = await bookings.loadForSalon(testSalonId);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);

			// Verify booking format
			result.forEach(booking => {
				expect(booking.id).toBeDefined();
				expect(booking.booking_code).toBeDefined();
				expect(booking.salon_id).toBe(testSalonId);
				expect(booking.customer_phone).toBeDefined();
				expect(booking.customer_name).toBeDefined();
				expect(booking.service).toBeDefined();
				expect(booking.start_ts).toBeDefined();
				expect(booking.status).toBeDefined();
				expect(booking.created_at).toBeDefined();
			});
		});

		test('should return empty array for non-existent salon', async () => {
			const result = await bookings.loadForSalon('non_existent_salon_id');

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});
	});
});

describe('Data Consistency Tests', () => {
	test('should maintain date format consistency', async () => {
		const salon = await salons.upsert({
			phone_number_id: 'consistency_test_123',
			access_token: 'test_token',
			name: 'Consistency Test Salon'
		});

		// Check date formats are ISO strings
		expect(salon.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(salon.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

		// Cleanup
		await prisma.salon.delete({ where: { id: salon.id } });
	});

	test('should handle concurrent booking attempts', async () => {
		const salon = await salons.upsert({
			phone_number_id: 'concurrent_test_123',
			access_token: 'test_token',
			name: 'Concurrent Test Salon'
		});

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 7);
		const dateStr = tomorrow.toISOString().split('T')[0];

		const parsed = {
			date: dateStr,
			time: '12:00',
			name: 'Test',
			service: 'Test'
		};

		// Attempt multiple concurrent bookings
		const results = await Promise.all([
			bookings.tryCreateBookingFromParsed(parsed, 'phone1', salon.id),
			bookings.tryCreateBookingFromParsed(parsed, 'phone2', salon.id),
			bookings.tryCreateBookingFromParsed(parsed, 'phone3', salon.id)
		]);

		// Only one should succeed
		const successful = results.filter(r => r.ok);
		const failed = results.filter(r => !r.ok);

		expect(successful.length).toBe(1);
		expect(failed.length).toBe(2);
		failed.forEach(r => {
			expect(r.reason).toBe('busy');
		});

		// Cleanup
		await prisma.booking.deleteMany({ where: { salon_id: salon.id } });
		await prisma.salon.delete({ where: { id: salon.id } });
	});
});
