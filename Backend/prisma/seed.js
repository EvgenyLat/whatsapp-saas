'use strict';

/**
 * Prisma Seed Script
 *
 * This script seeds the database with initial data from:
 * 1. Environment variables (for default salon)
 * 2. Existing JSON files (if migrating)
 *
 * Run with: npm run db:seed
 * Or: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

// Paths to JSON data files
const DATA_DIR = path.join(__dirname, '..', 'data');
const SALONS_FILE = path.join(DATA_DIR, 'salons.json');

/**
 * Load JSON file safely
 */
function loadJSONFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Seed salons from JSON file or environment variables
 */
async function seedSalons() {
  console.log('Seeding salons...');

  let seededCount = 0;

  // Try to load from JSON file first (migration scenario)
  const salonsFromFile = loadJSONFile(SALONS_FILE);

  if (salonsFromFile && Array.isArray(salonsFromFile) && salonsFromFile.length > 0) {
    console.log(`Found ${salonsFromFile.length} salons in JSON file`);

    for (const salon of salonsFromFile) {
      try {
        await prisma.salon.upsert({
          where: { phone_number_id: salon.phone_number_id },
          update: {
            name: salon.name || 'Salon',
            access_token: salon.access_token,
            updated_at: salon.updated_at ? new Date(salon.updated_at) : new Date()
          },
          create: {
            id: salon.id,
            name: salon.name || 'Salon',
            phone_number_id: salon.phone_number_id,
            access_token: salon.access_token,
            is_active: true,
            created_at: salon.created_at ? new Date(salon.created_at) : new Date(),
            updated_at: salon.updated_at ? new Date(salon.updated_at) : new Date()
          }
        });
        seededCount++;
        console.log(`  ✓ Seeded salon: ${salon.name} (${salon.phone_number_id})`);
      } catch (error) {
        console.error(`  ✗ Failed to seed salon ${salon.phone_number_id}:`, error.message);
      }
    }
  }

  // Seed from environment variables (single-tenant mode)
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    console.log('Seeding default salon from environment variables...');

    try {
      const defaultSalon = await prisma.salon.upsert({
        where: { phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID },
        update: {
          access_token: process.env.WHATSAPP_ACCESS_TOKEN,
          updated_at: new Date()
        },
        create: {
          id: 'env-default',
          name: process.env.SALON_NAME || 'Default Salon',
          phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
          access_token: process.env.WHATSAPP_ACCESS_TOKEN,
          is_active: true
        }
      });

      console.log(`  ✓ Seeded default salon: ${defaultSalon.name}`);
      seededCount++;
    } catch (error) {
      console.error('  ✗ Failed to seed default salon:', error.message);
    }
  }

  console.log(`\nSeeded ${seededCount} salon(s) successfully`);
  return seededCount;
}

/**
 * Seed bookings from JSON files (migration scenario)
 */
async function seedBookings() {
  console.log('\nSeeding bookings...');

  if (!fs.existsSync(DATA_DIR)) {
    console.log('No data directory found, skipping booking migration');
    return 0;
  }

  let seededCount = 0;
  const files = fs.readdirSync(DATA_DIR);
  const bookingFiles = files.filter(f => f.startsWith('bookings_') && f.endsWith('.json'));

  if (bookingFiles.length === 0) {
    console.log('No booking files found');
    return 0;
  }

  console.log(`Found ${bookingFiles.length} booking file(s)`);

  for (const file of bookingFiles) {
    const filePath = path.join(DATA_DIR, file);
    const salonId = file.replace('bookings_', '').replace('.json', '');

    console.log(`\nProcessing ${file} (salon: ${salonId})...`);

    const bookings = loadJSONFile(filePath);

    if (!bookings || !Array.isArray(bookings)) {
      console.log(`  Skipping invalid file: ${file}`);
      continue;
    }

    console.log(`  Found ${bookings.length} booking(s)`);

    // Verify salon exists
    const salon = await prisma.salon.findUnique({
      where: { id: salonId }
    });

    if (!salon) {
      console.warn(`  Warning: Salon ${salonId} not found in database, skipping bookings`);
      continue;
    }

    for (const booking of bookings) {
      try {
        // Map status from lowercase to enum
        let status = 'CONFIRMED';
        if (booking.status) {
          status = booking.status.toUpperCase();
          // Validate status
          if (!['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status)) {
            status = 'CONFIRMED';
          }
        }

        await prisma.booking.upsert({
          where: {
            booking_code_salon_id: {
              booking_code: booking.booking_code,
              salon_id: salonId
            }
          },
          update: {
            customer_phone: booking.customer_phone,
            customer_name: booking.customer_name || 'Клиент',
            service: booking.service || 'услуга',
            start_ts: new Date(booking.start_ts),
            status: status,
            updated_at: new Date()
          },
          create: {
            id: booking.id,
            booking_code: booking.booking_code,
            salon_id: salonId,
            customer_phone: booking.customer_phone,
            customer_name: booking.customer_name || 'Клиент',
            service: booking.service || 'услуга',
            start_ts: new Date(booking.start_ts),
            status: status,
            created_at: booking.created_at ? new Date(booking.created_at) : new Date()
          }
        });

        seededCount++;
      } catch (error) {
        console.error(`  ✗ Failed to seed booking ${booking.booking_code}:`, error.message);
      }
    }

    console.log(`  ✓ Seeded bookings from ${file}`);
  }

  console.log(`\nSeeded ${seededCount} booking(s) successfully`);
  return seededCount;
}

/**
 * Main seed function
 */
async function main() {
  console.log('======================================');
  console.log('Starting database seeding...');
  console.log('======================================\n');

  try {
    // Seed salons first
    const salonCount = await seedSalons();

    // Seed bookings (only if we have salons)
    let bookingCount = 0;
    if (salonCount > 0) {
      bookingCount = await seedBookings();
    }

    console.log('\n======================================');
    console.log('Database seeding completed!');
    console.log('======================================');
    console.log(`Total salons: ${salonCount}`);
    console.log(`Total bookings: ${bookingCount}`);
    console.log('======================================\n');

  } catch (error) {
    console.error('\n======================================');
    console.error('ERROR: Database seeding failed!');
    console.error('======================================');
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
