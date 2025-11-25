#!/usr/bin/env node

/**
 * =============================================================================
 * RESPONSE COMPRESSION VALIDATION
 * =============================================================================
 * Validates that gzip compression is working and achieving target reduction
 * =============================================================================
 */

const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || 'your-admin-token',
  testSalonId: process.env.TEST_SALON_ID || 'test-salon-123',
  targetReduction: 0.60, // 60% compression
};

// =============================================================================
// ENDPOINTS TO TEST
// =============================================================================

const endpoints = [
  {
    name: 'Health Check (JSON)',
    path: '/healthz',
    method: 'GET',
    requiresAuth: false,
  },
  {
    name: 'Root Endpoint (JSON)',
    path: '/',
    method: 'GET',
    requiresAuth: false,
  },
  {
    name: 'List Bookings (Large JSON)',
    path: `/admin/bookings/${config.testSalonId}?page=1&limit=50`,
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'List Messages (Large JSON)',
    path: `/admin/messages/${config.testSalonId}?page=1&limit=100`,
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Stats (JSON with numbers)',
    path: `/admin/stats/${config.testSalonId}?startDate=${getDateDaysAgo(30)}&endDate=${new Date().toISOString()}`,
    method: 'GET',
    requiresAuth: true,
  },
  {
    name: 'Prometheus Metrics (Text)',
    path: '/metrics',
    method: 'GET',
    requiresAuth: false,
  },
];

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// =============================================================================
// HTTP REQUEST FUNCTIONS
// =============================================================================

function makeRequest(endpoint, compressed = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      method: endpoint.method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (endpoint.requiresAuth) {
      options.headers['x-admin-token'] = config.adminToken;
    }

    if (compressed) {
      options.headers['Accept-Encoding'] = 'gzip, deflate';
    }

    const req = lib.request(options, (res) => {
      const chunks = [];
      const isCompressed = res.headers['content-encoding'] === 'gzip';

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const compressedSize = buffer.length;

        if (isCompressed) {
          // Decompress to get original size
          zlib.gunzip(buffer, (err, decompressed) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                compressedSize: compressedSize,
                uncompressedSize: decompressed.length,
                isCompressed: true,
                compressionRatio: compressedSize / decompressed.length,
                reduction: ((decompressed.length - compressedSize) / decompressed.length) * 100,
              });
            }
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            compressedSize: compressedSize,
            uncompressedSize: compressedSize,
            isCompressed: false,
            compressionRatio: 1,
            reduction: 0,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

async function validateCompression() {
  console.log('═'.repeat(80));
  console.log('RESPONSE COMPRESSION VALIDATION');
  console.log('═'.repeat(80));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Target Reduction: ${(config.targetReduction * 100).toFixed(0)}%`);
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    config: config,
    endpoints: [],
    summary: {
      totalEndpoints: endpoints.length,
      compressed: 0,
      notCompressed: 0,
      meetsTarget: 0,
      belowTarget: 0,
    },
  };

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    console.log(`  ${endpoint.method} ${endpoint.path}`);

    try {
      // Test without compression header
      const uncompressed = await makeRequest(endpoint, false);

      // Test with compression header
      const compressed = await makeRequest(endpoint, true);

      const result = {
        endpoint: {
          name: endpoint.name,
          path: endpoint.path,
          method: endpoint.method,
        },
        uncompressed: {
          size: uncompressed.uncompressedSize,
          headers: {
            'content-encoding': uncompressed.headers['content-encoding'],
            'content-length': uncompressed.headers['content-length'],
          },
        },
        compressed: {
          size: compressed.compressedSize,
          originalSize: compressed.uncompressedSize,
          isCompressed: compressed.isCompressed,
          compressionRatio: compressed.compressionRatio,
          reduction: compressed.reduction,
          headers: {
            'content-encoding': compressed.headers['content-encoding'],
            'content-length': compressed.headers['content-length'],
            'vary': compressed.headers['vary'],
          },
        },
        meetsTarget: compressed.reduction >= config.targetReduction * 100,
      };

      // Print results
      if (compressed.isCompressed) {
        const symbol = result.meetsTarget ? '✓' : '⚠';
        console.log(`  ${symbol} Compressed: YES`);
        console.log(`     Original: ${formatBytes(compressed.uncompressedSize)}`);
        console.log(`     Compressed: ${formatBytes(compressed.compressedSize)}`);
        console.log(`     Reduction: ${compressed.reduction.toFixed(1)}% (target: ${(config.targetReduction * 100).toFixed(0)}%)`);
        console.log(`     Ratio: ${compressed.compressionRatio.toFixed(2)}x`);

        results.summary.compressed++;
        if (result.meetsTarget) {
          results.summary.meetsTarget++;
        } else {
          results.summary.belowTarget++;
        }
      } else {
        console.log(`  ✗ Compressed: NO`);
        console.log(`     Size: ${formatBytes(uncompressed.uncompressedSize)}`);
        console.log(`     Content-Encoding header: ${compressed.headers['content-encoding'] || 'missing'}`);
        results.summary.notCompressed++;
      }

      results.endpoints.push(result);
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }

    console.log('');
  }

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  console.log(`Total Endpoints: ${results.summary.totalEndpoints}`);
  console.log(`Compressed: ${results.summary.compressed}`);
  console.log(`Not Compressed: ${results.summary.notCompressed}`);
  console.log(`Meets Target (≥${(config.targetReduction * 100).toFixed(0)}%): ${results.summary.meetsTarget}`);
  console.log(`Below Target: ${results.summary.belowTarget}`);

  const avgReduction =
    results.endpoints
      .filter((e) => e.compressed.isCompressed)
      .reduce((sum, e) => sum + e.compressed.reduction, 0) /
    (results.summary.compressed || 1);

  console.log(`\nAverage Reduction: ${avgReduction.toFixed(1)}%`);

  // Calculate bandwidth savings
  const totalUncompressed = results.endpoints
    .filter((e) => e.compressed.isCompressed)
    .reduce((sum, e) => sum + e.compressed.originalSize, 0);

  const totalCompressed = results.endpoints
    .filter((e) => e.compressed.isCompressed)
    .reduce((sum, e) => sum + e.compressed.size, 0);

  const bandwidthSaved = totalUncompressed - totalCompressed;

  console.log(`\nBandwidth Savings:`);
  console.log(`  Uncompressed: ${formatBytes(totalUncompressed)}`);
  console.log(`  Compressed: ${formatBytes(totalCompressed)}`);
  console.log(`  Saved: ${formatBytes(bandwidthSaved)} (${((bandwidthSaved / totalUncompressed) * 100).toFixed(1)}%)`);

  const allCompressed = results.summary.notCompressed === 0;
  const allMeetTarget = results.summary.belowTarget === 0;

  if (allCompressed && allMeetTarget) {
    console.log(`\n✅ ALL VALIDATIONS PASSED`);
  } else {
    console.log(`\n⚠️  SOME VALIDATIONS FAILED`);
    if (!allCompressed) {
      console.log(`  - ${results.summary.notCompressed} endpoint(s) not compressed`);
    }
    if (!allMeetTarget) {
      console.log(`  - ${results.summary.belowTarget} endpoint(s) below target reduction`);
    }
  }

  console.log('');

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `compression-validation-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputPath}`);
  console.log('═'.repeat(80));

  return results;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  validateCompression()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error validating compression:', error);
      process.exit(1);
    });
}

module.exports = { validateCompression };
