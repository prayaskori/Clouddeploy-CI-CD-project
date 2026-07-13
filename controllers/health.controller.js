// controllers/health.controller.js
const si = require('systeminformation');
const os = require('os');

// GET /health - returns CPU, memory, disk usage, uptime, and timestamp
async function getHealth(req, res, next) {
  try {
    const [cpuLoad, mem, disks] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);

    const primaryDisk = disks[0] || {};
    const diskUsedPercent = primaryDisk.use !== undefined
      ? Number(primaryDisk.use.toFixed(2))
      : null;

    const memUsedPercent = Number(
      (((mem.total - mem.available) / mem.total) * 100).toFixed(2)
    );

    res.status(200).json({
      success: true,
      status: 'healthy',
      cpu: {
        usagePercent: Number(cpuLoad.currentLoad.toFixed(2)),
        cores: cpuLoad.cpus.length,
      },
      memory: {
        totalMB: Math.round(mem.total / 1024 / 1024),
        usedMB: Math.round((mem.total - mem.available) / 1024 / 1024),
        usagePercent: memUsedPercent,
      },
      disk: {
        mount: primaryDisk.mount || 'N/A',
        totalGB: primaryDisk.size ? Number((primaryDisk.size / 1024 / 1024 / 1024).toFixed(2)) : null,
        usedGB: primaryDisk.used ? Number((primaryDisk.used / 1024 / 1024 / 1024).toFixed(2)) : null,
        usagePercent: diskUsedPercent,
      },
      uptimeSeconds: Math.floor(os.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHealth };
