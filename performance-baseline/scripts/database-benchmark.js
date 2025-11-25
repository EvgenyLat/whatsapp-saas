#!/usr/bin/env node

/**
 * =============================================================================
 * DATABASE PERFORMANCE BENCHMARK
 * =============================================================================
 * Analyzes database query performance using EXPLAIN ANALYZE
 * =============================================================================
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'whatsapp_saas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  testSalonId: process.env.TEST_SALON_ID || 'test-salon-123',
  slowQueryThreshold: 100, // ms
};

const pool = new Pool(config.database);

// =============================================================================
// QUERIES TO BENCHMARK
// =============================================================================

const queries = [
  {
    name: 'List Bookings (10 items, page 1)',
    sql: `
      SELECT * FROM bookings
      WHERE salon_id = $1
      ORDER BY appointment_date DESC
      LIMIT 10 OFFSET 0
    `,
    params: [config.testSalonId],
  },
  {
    name: 'List Bookings with Status Filter',
    sql: `
      SELECT * FROM bookings
      WHERE salon_id = $1 AND status = $2
      ORDER BY appointment_date DESC
      LIMIT 10
    `,
    params: [config.testSalonId, 'confirmed'],
  },
  {
    name: 'Count Bookings by Status',
    sql: `
      SELECT status, COUNT(*) as count
      FROM bookings
      WHERE salon_id = $1
      GROUP BY status
    `,
    params: [config.testSalonId],
  },
  {
    name: 'List Messages (10 items)',
    sql: `
      SELECT * FROM messages
      WHERE salon_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
    params: [config.testSalonId],
  },
  {
    name: 'Count Messages by Direction',
    sql: `
      SELECT direction, COUNT(*) as count
      FROM messages
      WHERE salon_id = $1
      GROUP BY direction
    `,
    params: [config.testSalonId],
  },
  {
    name: 'Bookings in Date Range',
    sql: `
      SELECT * FROM bookings
      WHERE salon_id = $1
        AND appointment_date >= $2
        AND appointment_date <= $3
      ORDER BY appointment_date
    `,
    params: [
      config.testSalonId,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString(),
    ],
  },
  {
    name: 'Messages in Date Range',
    sql: `
      SELECT * FROM messages
      WHERE salon_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
    `,
    params: [
      config.testSalonId,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString(),
    ],
  },
  {
    name: 'Conversations with Message Count',
    sql: `
      SELECT
        c.*,
        COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.salon_id = $1
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 20
    `,
    params: [config.testSalonId],
  },
  {
    name: 'Daily Bookings Stats (30 days)',
    sql: `
      SELECT
        DATE(appointment_date) as date,
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM bookings
      WHERE salon_id = $1
        AND appointment_date >= $2
      GROUP BY DATE(appointment_date)
      ORDER BY date DESC
    `,
    params: [
      config.testSalonId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ],
  },
  {
    name: 'AI Conversation Analytics',
    sql: `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_messages,
        COUNT(CASE WHEN ai_response IS NOT NULL THEN 1 END) as ai_responses,
        AVG(CASE WHEN ai_response IS NOT NULL THEN confidence ELSE NULL END) as avg_confidence
      FROM messages
      WHERE salon_id = $1
        AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
    params: [
      config.testSalonId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ],
  },
];

// =============================================================================
// BENCHMARK FUNCTIONS
// =============================================================================

async function explainAnalyze(query) {
  const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`;

  try {
    const result = await pool.query(explainSql, query.params);
    return result.rows[0]['QUERY PLAN'][0];
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

async function benchmarkQuery(query, iterations = 10) {
  const durations = [];

  // Warmup
  for (let i = 0; i < 3; i++) {
    await pool.query(query.sql, query.params);
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await pool.query(query.sql, query.params);
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to ms
    durations.push(duration);
  }

  const sorted = durations.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

async function getTableStats() {
  const stats = [];

  const tables = ['salons', 'bookings', 'conversations', 'messages'];

  for (const table of tables) {
    try {
      // Row count
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      const rowCount = parseInt(countResult.rows[0].count);

      // Table size
      const sizeResult = await pool.query(`
        SELECT
          pg_size_pretty(pg_total_relation_size($1)) as total_size,
          pg_size_pretty(pg_relation_size($1)) as table_size,
          pg_size_pretty(pg_indexes_size($1)) as indexes_size
      `, [table]);

      stats.push({
        table: table,
        rowCount: rowCount,
        totalSize: sizeResult.rows[0].total_size,
        tableSize: sizeResult.rows[0].table_size,
        indexesSize: sizeResult.rows[0].indexes_size,
      });
    } catch (error) {
      stats.push({
        table: table,
        error: error.message,
      });
    }
  }

  return stats;
}

async function getIndexUsage() {
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}

async function getSlowQueries() {
  const query = `
    SELECT
      query,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time,
      stddev_exec_time
    FROM pg_stat_statements
    WHERE mean_exec_time > $1
    ORDER BY mean_exec_time DESC
    LIMIT 10
  `;

  try {
    const result = await pool.query(query, [config.slowQueryThreshold]);
    return result.rows;
  } catch (error) {
    // pg_stat_statements extension might not be installed
    return [];
  }
}

// =============================================================================
// MAIN BENCHMARK
// =============================================================================

async function runBenchmarks() {
  console.log('═'.repeat(80));
  console.log('DATABASE PERFORMANCE BENCHMARK');
  console.log('═'.repeat(80));
  console.log(`Database: ${config.database.database}@${config.database.host}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const results = [];

  // Table statistics
  console.log('Collecting table statistics...');
  const tableStats = await getTableStats();
  console.log(`  Found ${tableStats.length} tables`);

  // Index usage
  console.log('Analyzing index usage...');
  const indexUsage = await getIndexUsage();
  console.log(`  Found ${indexUsage.length} indexes`);

  // Slow queries
  console.log('Checking for slow queries...');
  const slowQueries = await getSlowQueries();
  if (slowQueries.length > 0) {
    console.log(`  Found ${slowQueries.length} slow queries`);
  }

  console.log('');

  // Benchmark each query
  for (const query of queries) {
    console.log(`Benchmarking: ${query.name}`);

    // Get execution plan
    const plan = await explainAnalyze(query);

    // Benchmark performance
    const perf = await benchmarkQuery(query);

    const result = {
      query: {
        name: query.name,
        sql: query.sql,
      },
      performance: perf,
      executionPlan: plan,
      isSlow: perf.avg > config.slowQueryThreshold,
    };

    results.push(result);

    // Print summary
    console.log(`  Avg: ${perf.avg.toFixed(2)}ms | P95: ${perf.p95.toFixed(2)}ms | ${result.isSlow ? '⚠️  SLOW' : '✓'}`);

    if (plan.error) {
      console.log(`  Error: ${plan.error}`);
    } else if (plan['Planning Time'] && plan['Execution Time']) {
      console.log(`  Plan: ${plan['Planning Time'].toFixed(2)}ms | Exec: ${plan['Execution Time'].toFixed(2)}ms`);
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  const slowQueries = results.filter((r) => r.isSlow);
  console.log(`Total Queries: ${results.length}`);
  console.log(`Slow Queries (>${config.slowQueryThreshold}ms): ${slowQueries.length}`);

  if (slowQueries.length > 0) {
    console.log('\nSlow Queries:');
    slowQueries.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.query.name}: ${q.performance.avg.toFixed(2)}ms`);
    });
  }

  console.log('\nTable Statistics:');
  tableStats.forEach((stat) => {
    if (!stat.error) {
      console.log(`  ${stat.table}: ${stat.rowCount} rows, ${stat.totalSize}`);
    }
  });

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `database-benchmark-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    config: config,
    tableStats: tableStats,
    indexUsage: indexUsage,
    results: results,
    summary: {
      totalQueries: results.length,
      slowQueries: slowQueries.length,
      avgQueryTime: results.reduce((sum, r) => sum + r.performance.avg, 0) / results.length,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
  console.log('═'.repeat(80));

  return report;
}

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  runBenchmarks()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error running benchmarks:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { runBenchmarks };
