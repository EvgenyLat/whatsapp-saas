'use strict';

/**
 * Data Migration Script
 *
 * Migrates data from JSON files to PostgreSQL database
 *
 * Features:
 * - Backs up existing JSON files before migration
 * - Validates data before insertion
 * - Provides detailed progress reporting
 * - Handles errors gracefully
 * - Can be run multiple times safely (idempotent)
 *
 * Usage:
 *   node scripts/migrate-data.js [--dry-run] [--backup-only]
 *
 * Options:
 *   --dry-run      Preview what would be migrated without making changes
 *   --backup-only  Only create backups, don't migrate data
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'data_backup');
const SALONS_FILE = path.join(DATA_DIR, 'salons.json');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isBackupOnly = args.includes('--backup-only');

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Backup a file with timestamp
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `${timestamp}_${fileName}`);

  fs.copyFileSync(filePath, backupPath);
  console.log(`  ✓ Backed up: ${fileName} -> ${path.basename(backupPath)}`);

  return backupPath;
}

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
    console.error(`Error loading ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Validate salon data
 */
function validateSalon(salon, index) {
  const errors = [];

  if (!salon.phone_number_id) {
    errors.push('Missing phone_number_id');
  }
  if (!salon.access_token) {
    errors.push('Missing access_token');
  }

  if (errors.length > 0) {
    console.warn(`  Warning: Salon at index ${index} has validation errors:`, errors);
    return false;
  }

  return true;
}

/**
 * Validate booking data
 */
function validateBooking(booking, index) {
  const errors = [];

  if (!booking.booking_code) {
    errors.push('Missing booking_code');
  }
  if (!booking.customer_phone) {
    errors.push('Missing customer_phone');
  }
  if (!booking.start_ts) {
    errors.push('Missing start_ts');
  }
  if (!booking.salon_id) {
    errors.push('Missing salon_id');
  }

  if (errors.length > 0) {
    console.warn(`  Warning: Booking at index ${index} has validation errors:`, errors);
    return false;
  }

  return true;
}

/**
 * Backup all data files
 */
async function backupAllFiles() {
  console.log('\n======================================');
  console.log('Backing up data files...');
  console.log('======================================\n');

  ensureBackupDir();

  let backupCount = 0;

  // Backup salons.json
  if (fs.existsSync(SALONS_FILE)) {
    backupFile(SALONS_FILE);
    backupCount++;
  }

  // Backup all booking files
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    const bookingFiles = files.filter(f => f.startsWith('bookings_') && f.endsWith('.json'));

    for (const file of bookingFiles) {
      const filePath = path.join(DATA_DIR, file);
      backupFile(filePath);
      backupCount++;
    }
  }

  if (backupCount === 0) {
    console.log('  No files to backup');
  } else {
    console.log(`\n✓ Backed up ${backupCount} file(s) to ${BACKUP_DIR}`);
  }

  return backupCount;
}

/**
 * Migrate salons
 */
async function migrateSalons() {
  console.log('\n======================================');
  console.log('Migrating salons...');
  console.log('======================================\n');

  const salonsData = loadJSONFile(SALONS_FILE);

  if (!salonsData || salonsData.length === 0) {
    console.log('No salon data found in JSON file');
    return { success: 0, failed: 0, skipped: 0 };
  }

  console.log(`Found ${salonsData.length} salon(s) in JSON file\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < salonsData.length; i++) {
    const salon = salonsData[i];

    console.log(`[${i + 1}/${salonsData.length}] Processing: ${salon.name || 'Unnamed'} (${salon.phone_number_id})`);

    // Validate
    if (!validateSalon(salon, i)) {
      console.log('  ✗ Skipped: Validation failed\n');
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log('  → Would migrate salon (dry-run mode)\n');
      success++;
      continue;
    }

    try {
      // Check if salon already exists
      const existing = await prisma.salon.findUnique({
        where: { phone_number_id: salon.phone_number_id }
      });

      if (existing) {
        console.log('  ℹ Already exists in database, updating...');
        await prisma.salon.update({
          where: { id: existing.id },
          data: {
            name: salon.name || existing.name,
            access_token: salon.access_token,
            updated_at: new Date()
          }
        });
        console.log('  ✓ Updated\n');
      } else {
        await prisma.salon.create({
          data: {
            id: salon.id,
            name: salon.name || 'Salon',
            phone_number_id: salon.phone_number_id,
            access_token: salon.access_token,
            is_active: true,
            created_at: salon.created_at ? new Date(salon.created_at) : new Date(),
            updated_at: salon.updated_at ? new Date(salon.updated_at) : new Date()
          }
        });
        console.log('  ✓ Migrated\n');
      }

      success++;
    } catch (error) {
      console.error('  ✗ Failed:', error.message, '\n');
      failed++;
    }
  }

  return { success, failed, skipped };
}

/**
 * Migrate bookings
 */
async function migrateBookings() {
  console.log('\n======================================');
  console.log('Migrating bookings...');
  console.log('======================================\n');

  if (!fs.existsSync(DATA_DIR)) {
    console.log('No data directory found');
    return { success: 0, failed: 0, skipped: 0 };
  }

  const files = fs.readdirSync(DATA_DIR);
  const bookingFiles = files.filter(f => f.startsWith('bookings_') && f.endsWith('.json'));

  if (bookingFiles.length === 0) {
    console.log('No booking files found');
    return { success: 0, failed: 0, skipped: 0 };
  }

  console.log(`Found ${bookingFiles.length} booking file(s)\n`);

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const file of bookingFiles) {
    const filePath = path.join(DATA_DIR, file);
    const salonId = file.replace('bookings_', '').replace('.json', '');

    console.log(`\n--- Processing: ${file} (salon: ${salonId}) ---`);

    // Verify salon exists
    if (!isDryRun) {
      const salon = await prisma.salon.findUnique({
        where: { id: salonId }
      });

      if (!salon) {
        console.warn(`  ✗ Salon ${salonId} not found in database, skipping file\n`);
        continue;
      }
    }

    const bookings = loadJSONFile(filePath);

    if (!bookings || bookings.length === 0) {
      console.log('  No bookings in file\n');
      continue;
    }

    console.log(`  Found ${bookings.length} booking(s)\n`);

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];

      console.log(`  [${i + 1}/${bookings.length}] ${booking.booking_code} - ${booking.customer_name}`);

      // Validate
      if (!validateBooking(booking, i)) {
        console.log('    ✗ Skipped: Validation failed');
        totalSkipped++;
        continue;
      }

      if (isDryRun) {
        console.log('    → Would migrate (dry-run mode)');
        totalSuccess++;
        continue;
      }

      try {
        // Map status
        let status = 'CONFIRMED';
        if (booking.status) {
          status = booking.status.toUpperCase();
          if (!['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status)) {
            status = 'CONFIRMED';
          }
        }

        // Check if booking already exists
        const existing = await prisma.booking.findUnique({
          where: {
            booking_code_salon_id: {
              booking_code: booking.booking_code,
              salon_id: salonId
            }
          }
        });

        if (existing) {
          console.log('    ℹ Already exists, skipping');
          totalSkipped++;
        } else {
          await prisma.booking.create({
            data: {
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
          console.log('    ✓ Migrated');
          totalSuccess++;
        }
      } catch (error) {
        console.error('    ✗ Failed:', error.message);
        totalFailed++;
      }
    }
  }

  return { success: totalSuccess, failed: totalFailed, skipped: totalSkipped };
}

/**
 * Generate migration report
 */
function generateReport(salonResults, bookingResults, backupCount) {
  console.log('\n\n======================================');
  console.log('MIGRATION REPORT');
  console.log('======================================');

  if (isDryRun) {
    console.log('MODE: DRY RUN (no changes made)');
  } else if (isBackupOnly) {
    console.log('MODE: BACKUP ONLY');
  } else {
    console.log('MODE: FULL MIGRATION');
  }

  console.log('\nBackups:');
  console.log(`  Files backed up: ${backupCount}`);

  console.log('\nSalons:');
  console.log(`  Successful: ${salonResults.success}`);
  console.log(`  Failed: ${salonResults.failed}`);
  console.log(`  Skipped: ${salonResults.skipped}`);

  console.log('\nBookings:');
  console.log(`  Successful: ${bookingResults.success}`);
  console.log(`  Failed: ${bookingResults.failed}`);
  console.log(`  Skipped: ${bookingResults.skipped}`);

  console.log('\nTotal Records:');
  console.log(`  Migrated: ${salonResults.success + bookingResults.success}`);
  console.log(`  Failed: ${salonResults.failed + bookingResults.failed}`);
  console.log(`  Skipped: ${salonResults.skipped + bookingResults.skipped}`);

  console.log('======================================\n');

  if (isDryRun) {
    console.log('To perform the actual migration, run without --dry-run flag');
  } else if (!isBackupOnly) {
    console.log('Migration completed! Check the output above for any errors.');
    console.log(`Backups are stored in: ${BACKUP_DIR}`);
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   DATA MIGRATION SCRIPT              ║');
  console.log('║   JSON Files → PostgreSQL            ║');
  console.log('╚══════════════════════════════════════╝');

  if (isDryRun) {
    console.log('\nRunning in DRY-RUN mode (no changes will be made)');
  }
  if (isBackupOnly) {
    console.log('\nRunning in BACKUP-ONLY mode');
  }

  try {
    // Step 1: Backup all files
    const backupCount = await backupAllFiles();

    if (isBackupOnly) {
      console.log('\n✓ Backup completed');
      return;
    }

    // Step 2: Migrate salons
    const salonResults = await migrateSalons();

    // Step 3: Migrate bookings
    const bookingResults = await migrateBookings();

    // Step 4: Generate report
    generateReport(salonResults, bookingResults, backupCount);

    // Exit with error code if there were failures
    if (salonResults.failed > 0 || bookingResults.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n\n======================================');
    console.error('FATAL ERROR');
    console.error('======================================');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
