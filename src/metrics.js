const os = require('os');

//HTTP METRICS
let totalRequests = 0;
let methodCounts = {
  GET: 0,
  POST: 0,
  PUT: 0,
  DELETE: 0,
};

//AUTH METRICS
let authAttempts = {
  success: 0,
  failure: 0,
};

//USER METRICS
const activeUsers = new Set();

//PIZZA METRICS
let pizzasSold = 0;
let pizzaFailures = 0;
let revenue = 0;
let totalLatency = 0;
let latencyCount = 0;


function requestTracker(req, res, next) {
  totalRequests++;

  if (methodCounts[req.method] !== undefined) {
    methodCounts[req.method]++;
  }
  if (req.user && req.user.id) {
    activeUsers.add(req.user.id);
  }

  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;

    totalLatency += latency;
    latencyCount++;
  });
  next();
}


function trackAuth(success) {
  if (success) {
    authAttempts.success++;
  } else {
    authAttempts.failure++;
  }
}

function pizzaPurchase(success, latency, price) {
  if (success) {
    pizzasSold++;
    revenue += price;
  } else {
    pizzaFailures++;
  }

  totalLatency += latency;
  latencyCount++;
}


function collectMetrics() {
  const cpu = getCpuUsagePercentage();
  const memory = getMemoryUsagePercentage();

  const avgLatency = latencyCount === 0 ? 0 : totalLatency / latencyCount;

  return {
    httpMetrics: {
      totalRequests,
      methodCounts,
    },
    authMetrics: authAttempts,
    userMetrics: {
      activeUsers: activeUsers.size,
    },
    systemMetrics: {
      cpu,
      memory,
    },
    purchaseMetrics: {
      pizzasSold,
      pizzaFailures,
      revenue,
    },
    latencyMetrics: {
      avgLatency,
    },
  };
}

function resetMetrics() {
  totalRequests = 0;
  methodCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };

  authAttempts = { success: 0, failure: 0 };

  pizzasSold = 0;
  pizzaFailures = 0;
  revenue = 0;

  totalLatency = 0;
  latencyCount = 0;

  activeUsers.clear();
}


function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function sendMetricsPeriodically(period) {
  setInterval(() => {
    try {
      const data = collectMetrics();

      const metrics = new OtelMetricBuilder();
      metrics.add(data.httpMetrics);
      metrics.add(data.systemMetrics);
      metrics.add(data.userMetrics);
      metrics.add(data.purchaseMetrics);
      metrics.add(data.authMetrics);
      metrics.add(data.latencyMetrics);

      metrics.sendToGrafana();

      resetMetrics(); // IMPORTANT
    } catch (error) {
      console.log('Error sending metrics', error);
    }
  }, period);
}

module.exports = {
  requestTracker,
  trackAuth,
  pizzaPurchase,
  sendMetricsPeriodically,
};