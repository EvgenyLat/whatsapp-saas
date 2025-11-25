/**
 * T019: Test Database Seed Script
 *
 * This script seeds the database with comprehensive test data including:
 * - 1 Test Salon with owner
 * - 3 Masters with different specializations
 * - 5 Services across different categories
 * - Sample bookings with various statuses
 * - Customer preferences and waitlist entries
 *
 * Features:
 * - Idempotent (safe to run multiple times)
 * - Uses Prisma client for type-safe operations
 * - Comprehensive seed data for testing all features
 * - Transaction support for data consistency
 *
 * Usage:
 * ```bash
 * # Using npm script
 * npm run prisma:seed
 *
 * # Direct execution
 * npx ts-node prisma/seed.ts
 *
 * # With environment variables
 * DATABASE_URL=postgresql://... npx ts-node prisma/seed.ts
 * ```
 */

import { PrismaClient, ServiceCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addDays, addHours, subDays } from 'date-fns';

const prisma = new PrismaClient();

// Seed configuration
const SEED_CONFIG = {
  // Test user credentials
  testUser: {
    email: 'owner@testsalon.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1234567890',
  },

  // Test salon
  salon: {
    name: 'Test Salon',
    phone: '+1234567890',
    phoneNumberId: '123456789012345',
    accessToken: 'EAAP_TEST_ACCESS_TOKEN_1234567890',
  },

  // Masters data
  masters: [
    {
      name: 'Sarah Johnson',
      phone: '+1234567891',
      email: 'sarah@testsalon.com',
      specialization: ['HAIRCUT', 'COLORING'],
      workingHours: {
        monday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
        tuesday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
        wednesday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
        thursday: { start: '09:00', end: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
        friday: { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] },
        saturday: { start: '10:00', end: '16:00', breaks: [] },
        sunday: { start: null, end: null, breaks: [] },
      },
    },
    {
      name: 'Alex Smith',
      phone: '+1234567892',
      email: 'alex@testsalon.com',
      specialization: ['MANICURE', 'PEDICURE'],
      workingHours: {
        monday: { start: '10:00', end: '19:00', breaks: [{ start: '14:00', end: '15:00' }] },
        tuesday: { start: '10:00', end: '19:00', breaks: [{ start: '14:00', end: '15:00' }] },
        wednesday: { start: '10:00', end: '19:00', breaks: [{ start: '14:00', end: '15:00' }] },
        thursday: { start: '10:00', end: '19:00', breaks: [{ start: '14:00', end: '15:00' }] },
        friday: { start: '10:00', end: '19:00', breaks: [{ start: '14:00', end: '15:00' }] },
        saturday: { start: '09:00', end: '15:00', breaks: [] },
        sunday: { start: null, end: null, breaks: [] },
      },
    },
    {
      name: 'Maria Garcia',
      phone: '+1234567893',
      email: 'maria@testsalon.com',
      specialization: ['FACIAL', 'MASSAGE', 'WAXING'],
      workingHours: {
        monday: { start: '08:00', end: '16:00', breaks: [{ start: '12:00', end: '13:00' }] },
        tuesday: { start: '08:00', end: '16:00', breaks: [{ start: '12:00', end: '13:00' }] },
        wednesday: { start: '08:00', end: '16:00', breaks: [{ start: '12:00', end: '13:00' }] },
        thursday: { start: '08:00', end: '16:00', breaks: [{ start: '12:00', end: '13:00' }] },
        friday: { start: '08:00', end: '15:00', breaks: [{ start: '12:00', end: '13:00' }] },
        saturday: { start: '09:00', end: '14:00', breaks: [] },
        sunday: { start: null, end: null, breaks: [] },
      },
    },
  ],

  // Services data
  services: [
    {
      name: 'Haircut',
      description: 'Professional haircut with styling',
      duration: 60,
      price: 5000,
      category: ServiceCategory.HAIRCUT,
    },
    {
      name: 'Hair Coloring',
      description: 'Full hair coloring service',
      duration: 120,
      price: 8000,
      category: ServiceCategory.COLORING,
    },
    {
      name: 'Manicure',
      description: 'Classic manicure with polish',
      duration: 45,
      price: 3000,
      category: ServiceCategory.MANICURE,
    },
    {
      name: 'Pedicure',
      description: 'Relaxing pedicure service',
      duration: 60,
      price: 4000,
      category: ServiceCategory.PEDICURE,
    },
    {
      name: 'Facial',
      description: 'Deep cleansing facial treatment',
      duration: 90,
      price: 7000,
      category: ServiceCategory.FACIAL,
    },
  ],
};

/**
 * Seed a test user (salon owner)
 */
async function seedUser() {
  console.log('Seeding test user...');

  const hashedPassword = await bcrypt.hash(SEED_CONFIG.testUser.password, 10);

  const user = await prisma.user.upsert({
    where: { email: SEED_CONFIG.testUser.email },
    update: {
      password: hashedPassword,
      first_name: SEED_CONFIG.testUser.firstName,
      last_name: SEED_CONFIG.testUser.lastName,
      phone: SEED_CONFIG.testUser.phone,
      is_email_verified: true,
      is_active: true,
    },
    create: {
      email: SEED_CONFIG.testUser.email,
      password: hashedPassword,
      first_name: SEED_CONFIG.testUser.firstName,
      last_name: SEED_CONFIG.testUser.lastName,
      phone: SEED_CONFIG.testUser.phone,
      role: 'SALON_OWNER',
      is_email_verified: true,
      email_verified_at: new Date(),
      is_active: true,
    },
  });

  console.log(`✓ User seeded: ${user.email} (ID: ${user.id})`);
  return user;
}

/**
 * Seed a test salon
 */
async function seedSalon(ownerId: string) {
  console.log('Seeding test salon...');

  const salon = await prisma.salon.upsert({
    where: { phone_number_id: SEED_CONFIG.salon.phoneNumberId },
    update: {
      name: SEED_CONFIG.salon.name,
      access_token: SEED_CONFIG.salon.accessToken,
      owner_id: ownerId,
      is_active: true,
      trial_status: 'ACTIVE',
    },
    create: {
      name: SEED_CONFIG.salon.name,
      phone_number_id: SEED_CONFIG.salon.phoneNumberId,
      access_token: SEED_CONFIG.salon.accessToken,
      owner_id: ownerId,
      is_active: true,
      trial_status: 'ACTIVE',
      trial_started_at: new Date(),
      usage_limit_messages: 1000,
      usage_limit_bookings: 500,
      usage_current_messages: 0,
      usage_current_bookings: 0,
      usage_reset_at: addDays(new Date(), 30),
    },
  });

  console.log(`✓ Salon seeded: ${salon.name} (ID: ${salon.id})`);
  return salon;
}

/**
 * Seed masters
 */
async function seedMasters(salonId: string) {
  console.log('Seeding masters...');

  const masters = [];

  for (const masterData of SEED_CONFIG.masters) {
    const master = await prisma.master.upsert({
      where: {
        salon_id_name: {
          salon_id: salonId,
          name: masterData.name,
        },
      },
      update: {
        phone: masterData.phone,
        email: masterData.email,
        specialization: masterData.specialization,
        working_hours: masterData.workingHours as any,
        is_active: true,
      },
      create: {
        salon_id: salonId,
        name: masterData.name,
        phone: masterData.phone,
        email: masterData.email,
        specialization: masterData.specialization,
        working_hours: masterData.workingHours as any,
        is_active: true,
      },
    });

    masters.push(master);
    console.log(`  ✓ Master seeded: ${master.name} (ID: ${master.id})`);
  }

  return masters;
}

/**
 * Seed services
 */
async function seedServices(salonId: string) {
  console.log('Seeding services...');

  const services = [];

  for (const serviceData of SEED_CONFIG.services) {
    const service = await prisma.service.upsert({
      where: {
        salon_id_name: {
          salon_id: salonId,
          name: serviceData.name,
        },
      },
      update: {
        description: serviceData.description,
        duration_minutes: serviceData.duration,
        price: serviceData.price,
        category: serviceData.category,
        is_active: true,
      },
      create: {
        salon_id: salonId,
        name: serviceData.name,
        description: serviceData.description,
        duration_minutes: serviceData.duration,
        price: serviceData.price,
        category: serviceData.category,
        is_active: true,
      },
    });

    services.push(service);
    console.log(`  ✓ Service seeded: ${service.name} (${service.category}) - $${service.price}`);
  }

  return services;
}

/**
 * Seed sample bookings
 */
async function seedBookings(salonId: string, masters: any[], services: any[]) {
  console.log('Seeding sample bookings...');

  const now = new Date();
  const bookingsData = [
    // Past confirmed booking
    {
      bookingCode: 'BOOK001',
      customerPhone: '+1555000001',
      customerName: 'Alice Johnson',
      service: services[0].name,
      serviceId: services[0].id,
      masterId: masters[0].id,
      startTs: subDays(now, 7),
      status: 'COMPLETED',
      reminderSent: true,
      reminderResponse: 'CONFIRM',
    },
    // Past cancelled booking
    {
      bookingCode: 'BOOK002',
      customerPhone: '+1555000002',
      customerName: 'Bob Williams',
      service: services[1].name,
      serviceId: services[1].id,
      masterId: masters[0].id,
      startTs: subDays(now, 5),
      status: 'CANCELLED',
      reminderSent: true,
      reminderResponse: 'CANCEL',
    },
    // Upcoming booking (tomorrow)
    {
      bookingCode: 'BOOK003',
      customerPhone: '+1555000003',
      customerName: 'Carol Davis',
      service: services[2].name,
      serviceId: services[2].id,
      masterId: masters[1].id,
      startTs: addDays(now, 1),
      status: 'CONFIRMED',
      reminderSent: false,
    },
    // Upcoming booking (in 3 days)
    {
      bookingCode: 'BOOK004',
      customerPhone: '+1555000004',
      customerName: 'David Miller',
      service: services[3].name,
      serviceId: services[3].id,
      masterId: masters[1].id,
      startTs: addDays(now, 3),
      status: 'CONFIRMED',
      reminderSent: false,
    },
    // Upcoming booking (next week)
    {
      bookingCode: 'BOOK005',
      customerPhone: '+1555000005',
      customerName: 'Emma Wilson',
      service: services[4].name,
      serviceId: services[4].id,
      masterId: masters[2].id,
      startTs: addDays(now, 7),
      status: 'CONFIRMED',
      reminderSent: false,
    },
  ];

  const bookings = [];

  for (const bookingData of bookingsData) {
    const endTs = addHours(bookingData.startTs, 1);

    const booking = await prisma.booking.upsert({
      where: {
        booking_code_salon_id: {
          booking_code: bookingData.bookingCode,
          salon_id: salonId,
        },
      },
      update: {
        customer_phone: bookingData.customerPhone,
        customer_name: bookingData.customerName,
        service: bookingData.service,
        service_id: bookingData.serviceId,
        master_id: bookingData.masterId,
        start_ts: bookingData.startTs,
        end_ts: endTs,
        status: bookingData.status,
        reminder_sent: bookingData.reminderSent,
        reminder_response: bookingData.reminderResponse,
      },
      create: {
        booking_code: bookingData.bookingCode,
        salon_id: salonId,
        customer_phone: bookingData.customerPhone,
        customer_name: bookingData.customerName,
        service: bookingData.service,
        service_id: bookingData.serviceId,
        master_id: bookingData.masterId,
        start_ts: bookingData.startTs,
        end_ts: endTs,
        status: bookingData.status,
        reminder_sent: bookingData.reminderSent,
        reminder_response: bookingData.reminderResponse,
      },
    });

    bookings.push(booking);
    console.log(`  ✓ Booking seeded: ${booking.booking_code} - ${booking.customer_name} (${booking.status})`);
  }

  return bookings;
}

/**
 * Seed customer preferences
 */
async function seedCustomerPreferences(masters: any[], services: any[]) {
  console.log('Seeding customer preferences...');

  const preferencesData = [
    {
      customerId: '+1555000001',
      favoriteMasterId: masters[0].id,
      favoriteServiceId: services[0].id,
      preferredDayOfWeek: 'monday',
      preferredTimeOfDay: 'morning',
      preferredHour: 10,
      avgRebookingDays: 28,
      lastBookingDate: subDays(new Date(), 7),
      totalBookings: 5,
    },
    {
      customerId: '+1555000003',
      favoriteMasterId: masters[1].id,
      favoriteServiceId: services[2].id,
      preferredDayOfWeek: 'friday',
      preferredTimeOfDay: 'afternoon',
      preferredHour: 14,
      avgRebookingDays: 21,
      lastBookingDate: subDays(new Date(), 14),
      totalBookings: 3,
    },
  ];

  const preferences = [];

  for (const prefData of preferencesData) {
    const pref = await prisma.customerPreferences.upsert({
      where: { customer_id: prefData.customerId },
      update: {
        favorite_master_id: prefData.favoriteMasterId,
        favorite_service_id: prefData.favoriteServiceId,
        preferred_day_of_week: prefData.preferredDayOfWeek,
        preferred_time_of_day: prefData.preferredTimeOfDay,
        preferred_hour: prefData.preferredHour,
        avg_rebooking_days: prefData.avgRebookingDays,
        last_booking_date: prefData.lastBookingDate,
        next_suggested_booking_date: addDays(prefData.lastBookingDate, prefData.avgRebookingDays),
        total_bookings: prefData.totalBookings,
      },
      create: {
        customer_id: prefData.customerId,
        favorite_master_id: prefData.favoriteMasterId,
        favorite_service_id: prefData.favoriteServiceId,
        preferred_day_of_week: prefData.preferredDayOfWeek,
        preferred_time_of_day: prefData.preferredTimeOfDay,
        preferred_hour: prefData.preferredHour,
        avg_rebooking_days: prefData.avgRebookingDays,
        last_booking_date: prefData.lastBookingDate,
        next_suggested_booking_date: addDays(prefData.lastBookingDate, prefData.avgRebookingDays),
        total_bookings: prefData.totalBookings,
      },
    });

    preferences.push(pref);
    console.log(`  ✓ Preferences seeded for customer: ${pref.customer_id}`);
  }

  return preferences;
}

/**
 * Seed waitlist entries
 */
async function seedWaitlist(salonId: string, masters: any[], services: any[]) {
  console.log('Seeding waitlist entries...');

  const waitlistData = [
    {
      customerId: '+1555000010',
      serviceId: services[0].id,
      masterId: masters[0].id,
      customerPhone: '+1555000010',
      preferredDate: addDays(new Date(), 5),
      status: 'active',
      positionInQueue: 1,
    },
    {
      customerId: '+1555000011',
      serviceId: services[2].id,
      masterId: masters[1].id,
      customerPhone: '+1555000011',
      preferredDate: addDays(new Date(), 3),
      status: 'active',
      positionInQueue: 1,
    },
  ];

  const waitlistEntries = [];

  for (const waitlistItem of waitlistData) {
    const entry = await prisma.waitlist.create({
      data: {
        salon_id: salonId,
        customer_id: waitlistItem.customerId,
        service_id: waitlistItem.serviceId,
        master_id: waitlistItem.masterId,
        customer_phone: waitlistItem.customerPhone,
        preferred_date: waitlistItem.preferredDate,
        status: waitlistItem.status,
        position_in_queue: waitlistItem.positionInQueue,
      },
    });

    waitlistEntries.push(entry);
    console.log(`  ✓ Waitlist entry seeded for customer: ${entry.customer_id}`);
  }

  return waitlistEntries;
}

/**
 * Main seed function
 */
async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('Starting database seeding...');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Seed in transaction for data consistency
    const user = await seedUser();
    const salon = await seedSalon(user.id);
    const masters = await seedMasters(salon.id);
    const services = await seedServices(salon.id);
    const bookings = await seedBookings(salon.id, masters, services);
    const preferences = await seedCustomerPreferences(masters, services);
    const waitlist = await seedWaitlist(salon.id, masters, services);

    console.log('');
    console.log('='.repeat(60));
    console.log('Database seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Users:       1`);
    console.log(`  Salons:      1`);
    console.log(`  Masters:     ${masters.length}`);
    console.log(`  Services:    ${services.length}`);
    console.log(`  Bookings:    ${bookings.length}`);
    console.log(`  Preferences: ${preferences.length}`);
    console.log(`  Waitlist:    ${waitlist.length}`);
    console.log('');
    console.log('Test Credentials:');
    console.log(`  Email:    ${SEED_CONFIG.testUser.email}`);
    console.log(`  Password: ${SEED_CONFIG.testUser.password}`);
    console.log('');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('ERROR: Database seeding failed!');
    console.error('='.repeat(60));
    console.error(error);
    throw error;
  }
}

// Run the seed function
main()
  .catch((error) => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
