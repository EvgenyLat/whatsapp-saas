#!/usr/bin/env node

/**
 * =============================================================================
 * SYSTEM RESOURCE MONITOR
 * =============================================================================
 * Monitors CPU, memory, disk I/O, and network during load tests
 * =============================================================================
 */

const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  duration: parseInt(process.env.MONITOR_DURATION || '60'), // seconds
  interval: parseInt(process.env.MONITOR_INTERVAL || '1'), // seconds
  processName: process.env.PROCESS_NAME || 'node',
};

// =============================================================================
// SYSTEM METRICS
// =============================================================================

function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // CPU usage calculation
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    cpu: {
      count: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed,
      idle: totalIdle,
      total: totalTick,
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: (usedMem / totalMem) * 100,
    },
    loadAverage: os.loadavg(),
    uptime: os.uptime(),
  };
}

async function getProcessMetrics() {
  const platform = os.platform();

  if (platform === 'win32') {
    return getProcessMetricsWindows();
  } else if (platform === 'linux') {
    return getProcessMetricsLinux();
  } else if (platform === 'darwin') {
    return getProcessMetricsMacOS();
  }

  return null;
}

async function getProcessMetricsWindows() {
  try {
    const { stdout } = await execPromise(
      `powershell "Get-Process ${config.processName} | Select-Object CPU, WS, PM | ConvertTo-Json"`
    );

    const processes = JSON.parse(stdout);
    const procs = Array.isArray(processes) ? processes : [processes];

    const totalCpu = procs.reduce((sum, p) => sum + (parseFloat(p.CPU) || 0), 0);
    const totalMem = procs.reduce((sum, p) => sum + (parseInt(p.WS) || 0), 0);

    return {
      processCount: procs.length,
      cpuPercent: totalCpu,
      memoryBytes: totalMem,
      memoryMB: totalMem / (1024 * 1024),
    };
  } catch (error) {
    return null;
  }
}

async function getProcessMetricsLinux() {
  try {
    const { stdout } = await execPromise(
      `ps aux | grep ${config.processName} | grep -v grep | awk '{cpu+=$3; mem+=$4; rss+=$6} END {print cpu, mem, rss}'`
    );

    const [cpu, mem, rss] = stdout.trim().split(' ').map(parseFloat);

    return {
      processCount: 1,
      cpuPercent: cpu || 0,
      memoryPercent: mem || 0,
      memoryKB: rss || 0,
      memoryMB: (rss || 0) / 1024,
    };
  } catch (error) {
    return null;
  }
}

async function getProcessMetricsMacOS() {
  try {
    const { stdout } = await execPromise(
      `ps aux | grep ${config.processName} | grep -v grep | awk '{cpu+=$3; mem+=$4; rss+=$6} END {print cpu, mem, rss}'`
    );

    const [cpu, mem, rss] = stdout.trim().split(' ').map(parseFloat);

    return {
      processCount: 1,
      cpuPercent: cpu || 0,
      memoryPercent: mem || 0,
      memoryKB: rss || 0,
      memoryMB: (rss || 0) / 1024,
    };
  } catch (error) {
    return null;
  }
}

async function getDiskIO() {
  const platform = os.platform();

  if (platform === 'linux') {
    try {
      const { stdout } = await execPromise('iostat -x 1 2 | tail -n +4');
      // Parse iostat output
      return { raw: stdout };
    } catch (error) {
      return null;
    }
  }

  return null;
}

async function getNetworkStats() {
  const platform = os.platform();

  if (platform === 'linux') {
    try {
      const { stdout } = await execPromise('cat /proc/net/dev');
      // Parse network stats
      return { raw: stdout };
    } catch (error) {
      return null;
    }
  } else if (platform === 'darwin') {
    try {
      const { stdout } = await execPromise('netstat -ib');
      return { raw: stdout };
    } catch (error) {
      return null;
    }
  }

  return null;
}

// =============================================================================
// MONITORING LOOP
// =============================================================================

async function monitorSystem() {
  console.log('═'.repeat(80));
  console.log('SYSTEM RESOURCE MONITOR');
  console.log('═'.repeat(80));
  console.log(`Duration: ${config.duration} seconds`);
  console.log(`Interval: ${config.interval} second(s)`);
  console.log(`Process: ${config.processName}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  const samples = [];
  let previousCpu = getSystemMetrics().cpu;

  const startTime = Date.now();
  const endTime = startTime + config.duration * 1000;

  while (Date.now() < endTime) {
    const timestamp = new Date().toISOString();

    // System metrics
    const currentMetrics = getSystemMetrics();

    // Calculate CPU usage
    const idleDiff = currentMetrics.cpu.idle - previousCpu.idle;
    const totalDiff = currentMetrics.cpu.total - previousCpu.total;
    const cpuUsage = 100 - (100 * idleDiff) / totalDiff;

    previousCpu = currentMetrics.cpu;

    // Process metrics
    const processMetrics = await getProcessMetrics();

    const sample = {
      timestamp,
      system: {
        cpuUsage: cpuUsage,
        cpuCount: currentMetrics.cpu.count,
        memoryUsagePercent: currentMetrics.memory.usagePercent,
        memoryUsedMB: currentMetrics.memory.used / (1024 * 1024),
        memoryTotalMB: currentMetrics.memory.total / (1024 * 1024),
        loadAverage: currentMetrics.loadAverage,
      },
      process: processMetrics,
    };

    samples.push(sample);

    // Print progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(
      `\r  Progress: ${elapsed}/${config.duration}s | ` +
        `CPU: ${cpuUsage.toFixed(1)}% | ` +
        `Mem: ${currentMetrics.memory.usagePercent.toFixed(1)}% | ` +
        `Load: ${currentMetrics.loadAverage[0].toFixed(2)}`
    );

    // Wait for next interval
    await new Promise((resolve) => setTimeout(resolve, config.interval * 1000));
  }

  console.log('\n');

  // Calculate statistics
  const cpuUsages = samples.map((s) => s.system.cpuUsage);
  const memUsages = samples.map((s) => s.system.memoryUsagePercent);
  const loadAverages = samples.map((s) => s.system.loadAverage[0]);

  const stats = {
    cpu: calculateStats(cpuUsages),
    memory: calculateStats(memUsages),
    loadAverage: calculateStats(loadAverages),
  };

  // Process stats
  if (samples.some((s) => s.process)) {
    const processCpu = samples.filter((s) => s.process).map((s) => s.process.cpuPercent);
    const processMem = samples.filter((s) => s.process).map((s) => s.process.memoryMB);

    stats.process = {
      cpu: calculateStats(processCpu),
      memory: calculateStats(processMem),
    };
  }

  // Print summary
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Samples Collected: ${samples.length}`);
  console.log('');
  console.log('System CPU Usage:');
  console.log(`  Average: ${stats.cpu.avg.toFixed(2)}%`);
  console.log(`  Min: ${stats.cpu.min.toFixed(2)}%`);
  console.log(`  Max: ${stats.cpu.max.toFixed(2)}%`);
  console.log(`  P95: ${stats.cpu.p95.toFixed(2)}%`);
  console.log('');
  console.log('System Memory Usage:');
  console.log(`  Average: ${stats.memory.avg.toFixed(2)}%`);
  console.log(`  Min: ${stats.memory.min.toFixed(2)}%`);
  console.log(`  Max: ${stats.memory.max.toFixed(2)}%`);
  console.log(`  P95: ${stats.memory.p95.toFixed(2)}%`);
  console.log('');
  console.log('Load Average:');
  console.log(`  Average: ${stats.loadAverage.avg.toFixed(2)}`);
  console.log(`  Min: ${stats.loadAverage.min.toFixed(2)}`);
  console.log(`  Max: ${stats.loadAverage.max.toFixed(2)}`);

  if (stats.process) {
    console.log('');
    console.log(`Process (${config.processName}) CPU Usage:');
    console.log(`  Average: ${stats.process.cpu.avg.toFixed(2)}%`);
    console.log(`  Max: ${stats.process.cpu.max.toFixed(2)}%`);
    console.log('');
    console.log(`Process (${config.processName}) Memory Usage:');
    console.log(`  Average: ${stats.process.memory.avg.toFixed(2)} MB`);
    console.log(`  Max: ${stats.process.memory.max.toFixed(2)} MB`);
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(__dirname, '..', 'results', `system-monitor-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    config: config,
    samples: samples,
    stats: stats,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
  console.log('═'.repeat(80));

  return report;
}

function calculateStats(values) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
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

// =============================================================================
// MAIN
// =============================================================================

if (require.main === module) {
  monitorSystem()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error monitoring system:', error);
      process.exit(1);
    });
}

module.exports = { monitorSystem };
