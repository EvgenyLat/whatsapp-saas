#!/usr/bin/env node

/**
 * =============================================================================
 * DATABASE INDEX VALIDATION
 * =============================================================================
 * Validates that database indexes are properly created and being used
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'whatsapp_saas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  testSalonId: process.env.TEST_SALON_ID || 'test-salon-123',
};

const pool = new Pool(config.database);

// =============================================================================
// EXPECTED INDEXES (from Phase 1 optimizations)
// =============================================================================

const expectedIndexes = [
  {
    name: 'idx_bookings_salon_date',
    table: 'bookings',
    columns: ['salon_id', 'appointment_date'],
    type: 'btree',
  },
  {
    name: 'idx_bookings_salon_status',
    table: 'bookings',
    columns: ['salon_id', 'status', 'appointment_date'],
    type: 'btree',
  },
  {
    name: 'idx_messages_salon_created',
    table: 'messages',
    columns: ['salon_id', 'created_at'],
    type: 'btree',
  },
  {
    name: 'idx_messages_conversation',
    table: 'messages',
    columns: ['conversation_id', 'created_at'],
    type: 'btree',
  },
  {
    name: 'idx_conversations_salon_updated',
    table: 'conversations',
    columns: ['salon_id', 'updated_at'],
    type: 'btree',
  },
  {
    name: 'idx_conversations_phone',
    table: 'conversations',
    columns: ['salon_id', 'customer_phone'],
    type: 'btree',
  },
];

// =============================================================================
// VALIDATION QUERIES
// =============================================================================

const validationQueries = [
  {
    name: 'List Bookings by Salon',
    query: `
      SELECT * FROM bookings
      WHERE salon_id = $1
      ORDER BY appointment_date DESC
      LIMIT 20
    `,
    params: [config.testSalonId],
    expectedIndex: 'idx_bookings_salon_date',
    expectedTimeMs: 50,
  },
  {
    name: 'List Bookings by Status',
    query: `
      SELECT * FROM bookings
      WHERE salon_id = $1 AND status = $2
      ORDER BY appointment_date DESC
      LIMIT 20
    `,
    params: [config.testSalonId, 'confirmed'],
    expectedIndex: 'idx_bookings_salon_status',
    expectedTimeMs: 50,
  },
  {
    name: 'List Messages by Salon',
    query: `
      SELECT * FROM messages
      WHERE salon_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
    params: [config.testSalonId],
    expectedIndex: 'idx_messages_salon_created',
    expectedTimeMs: 50,
  },
  {
    name: 'List Messages by Conversation',
    query: `
      SELECT * FROM messages
      WHERE conversation_id = (
        SELECT id FROM conversations WHERE salon_id = $1 LIMIT 1
      )
      ORDER BY created_at ASC
    `,
    params: [config.testSalonId],
    expectedIndex: 'idx_messages_conversation',
    expectedTimeMs: 50,
  },
  {
    name: 'List Conversations by Salon',
    query: `
      SELECT * FROM conversations
      WHERE salon_id = $1
      ORDER BY updated_at DESC
      LIMIT 20
    `,
    params: [config.testSalonId],
    expectedIndex: 'idx_conversations_salon_updated',
    expectedTimeMs: 50,
  },
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

async function checkIndexExists(indexDef) {
  const query = `
    SELECT
      i.relname as index_name,
      t.relname as table_name,
      a.attname as column_name,
      am.amname as index_type
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_am am ON i.relam = am.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relname = $1 AND i.relname = $2
  `;

  const result = await pool.query(query, [indexDef.table, indexDef.name]);

  if (result.rows.length === 0) {
    return {
      exists: false,
      index: indexDef.name,
      table: indexDef.table,
    };
  }

  const columns = result.rows.map((r) => r.column_name);
  const indexType = result.rows[0].index_type;

  return {
    exists: true,
    index: indexDef.name,
    table: indexDef.table,
    columns: columns,
    type: indexType,
    matches: JSON.stringify(columns.sort()) === JSON.stringify(indexDef.columns.sort()),
  };
}

async function getQueryPlan(query, params) {
  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;

  try {
    const result = await pool.query(explainQuery, params);
    return result.rows[0]['QUERY PLAN'][0];
  } catch (error) {
    return { error: error.message };
  }
}

function extractIndexUsage(plan, depth = 0) {
  const indexes = [];

  if (plan['Index Name']) {
    indexes.push({
      index: plan['Index Name'],
      table: plan['Relation Name'],
      scanType: plan['Node Type'],
      executionTime: plan['Actual Total Time'],
    });
  }

  if (plan['Plans']) {
    plan['Plans'].forEach((subplan) => {
      indexes.push(...extractIndexUsage(subplan, depth + 1));
    });
  }

  return indexes;
}

async function measureQueryPerformance(queryDef, iterations = 10) {
  const times = [];

  // Warmup
  for (let i = 0; i < 3; i++) {
    await pool.query(queryDef.query, queryDef.params);
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await pool.query(queryDef.query, queryDef.params);
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1000000); // Convert to ms
  }

  const sorted = times.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}

// =============================================================================
// MAIN VALIDATION
// =============================================================================

async function validateIndexes() {
  console.log('═'.repeat(80));
  console.log('DATABASE INDEX VALIDATION');
  console.log('═'.repeat(80));
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    indexValidation: [],
    queryValidation: [],
    summary: {
      indexesExpected: expectedIndexes.length,
      indexesFound: 0,
      indexesMissing: 0,
      queriesOptimized: 0,
      queriesNeedWork: 0,
    },
  };

  // ============================================================================
  // 1. Validate Index Existence
  // ============================================================================

  console.log('1. VALIDATING INDEX EXISTENCE');
  console.log('─'.repeat(80));

  for (const indexDef of expectedIndexes) {
    const check = await checkIndexExists(indexDef);

    if (check.exists) {
      if (check.matches) {
        console.log(`✓ ${check.index} - EXISTS and CORRECT`);
        results.summary.indexesFound++;
      } else {
        console.log(`⚠ ${check.index} - EXISTS but WRONG COLUMNS`);
        console.log(`  Expected: ${indexDef.columns.join(', ')}`);
        console.log(`  Actual: ${check.columns.join(', ')}`);
        results.summary.indexesMissing++;
      }
    } else {
      console.log(`✗ ${check.index} - MISSING`);
      console.log(`  CREATE INDEX ${check.index} ON ${check.table}(...);`);
      results.summary.indexesMissing++;
    }

    results.indexValidation.push(check);
  }

  console.log('');

  // ============================================================================
  // 2. Validate Query Performance
  // ============================================================================

  console.log('2. VALIDATING QUERY PERFORMANCE');
  console.log('─'.repeat(80));

  for (const queryDef of validationQueries) {
    console.log(`\nQuery: ${queryDef.name}`);

    // Get execution plan
    const plan = await getQueryPlan(queryDef.query, queryDef.params);

    if (plan.error) {
      console.log(`  Error: ${plan.error}`);
      continue;
    }

    // Check index usage
    const indexesUsed = extractIndexUsage(plan.Plan || plan);

    if (indexesUsed.length > 0) {
      const usesExpectedIndex = indexesUsed.some((idx) => idx.index === queryDef.expectedIndex);

      if (usesExpectedIndex) {
        console.log(`  ✓ Using index: ${queryDef.expectedIndex}`);
      } else {
        console.log(`  ⚠ Not using expected index: ${queryDef.expectedIndex}`);
        console.log(`  Actually using: ${indexesUsed.map((i) => i.index).join(', ')}`);
      }
    } else {
      console.log(`  ✗ No index used - performing Seq Scan`);
    }

    // Measure performance
    const perf = await measureQueryPerformance(queryDef);

    const meetsTarget = perf.avg < queryDef.expectedTimeMs;
    const symbol = meetsTarget ? '✓' : '⚠';

    console.log(`  ${symbol} Performance:`);
    console.log(`     Average: ${perf.avg.toFixed(2)}ms (target: <${queryDef.expectedTimeMs}ms)`);
    console.log(`     P95: ${perf.p95.toFixed(2)}ms`);
    console.log(`     Planning: ${plan['Planning Time']?.toFixed(2) || 'N/A'}ms`);
    console.log(`     Execution: ${plan['Execution Time']?.toFixed(2) || 'N/A'}ms`);

    if (meetsTarget) {
      results.summary.queriesOptimized++;
    } else {
      results.summary.queriesNeedWork++;
    }

    results.queryValidation.push({
      query: queryDef.name,
      expectedIndex: queryDef.expectedIndex,
      indexesUsed: indexesUsed.map((i) => i.index),
      usesExpectedIndex: indexesUsed.some((idx) => idx.index === queryDef.expectedIndex),
      performance: perf,
      meetsTarget: meetsTarget,
      plan: {
        planningTime: plan['Planning Time'],
        executionTime: plan['Execution Time'],
      },
    });
  }

  console.log('');

  // ============================================================================
  // 3. Summary
  // ============================================================================

  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\nIndex Validation:`);
  console.log(`  Expected: ${results.summary.indexesExpected}`);
  console.log(`  Found: ${results.summary.indexesFound}`);
  console.log(`  Missing: ${results.summary.indexesMissing}`);

  console.log(`\nQuery Performance:`);
  console.log(`  Optimized: ${results.summary.queriesOptimized}`);
  console.log(`  Need Work: ${results.summary.queriesNeedWork}`);

  const allIndexesPresent = results.summary.indexesMissing === 0;
  const allQueriesOptimized = results.summary.queriesNeedWork === 0;

  if (allIndexesPresent && allQueriesOptimized) {
    console.log(`\n✅ ALL VALIDATIONS PASSED`);
  } else {
    console.log(`\n⚠️  SOME VALIDATIONS FAILED`);
  }

  console.log('');

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `index-validation-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputPath}`);
  console.log('═'.repeat(80));

  return results;
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  validateIndexes()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error validating indexes:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { validateIndexes };
