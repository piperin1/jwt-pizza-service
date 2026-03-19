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
let totalPLatency = 0;
let latencyPCount = 0;


const config = require('./config.js');

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      asDouble: Number(metricValue),
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [
                        {
                          key: 'source',
                          value: { stringValue: "jwt-pizza-service-test" }
                    }]
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality =
      'AGGREGATION_TEMPORALITY_DELTA';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  }
  
  //console.log(`Sending metric to Grafana: ${metricName} = ${metricValue}`);

  fetch(`${config.metrics.endpointUrl}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`,
      'Content-Type': 'application/json',
    },
  }).catch((error) => {
    console.error('Error pushing metrics:', error);
  });
}

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

function pizzaPurchase(success, platency, price) {
  if (success) {
    pizzasSold++;
    revenue += price;
    //console.log("TRACKING REVENUE:", revenue);
  } else {
    pizzaFailures++;
  }

  totalPLatency += platency;
  latencyPCount++;
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
  totalPLatency = 0;
  latencyPCount = 0;

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
      const cpu = getCpuUsagePercentage();
      const memory = getMemoryUsagePercentage();
      const avgLatency = latencyCount === 0 ? 0 : totalLatency / latencyCount;
      const avgPLatency = latencyPCount === 0 ? 0 : totalPLatency / latencyPCount;

      // ---- HTTP ----
      sendMetricToGrafana('http_requests_total', totalRequests, 'sum', '1');
      sendMetricToGrafana('http_get', methodCounts.GET, 'sum', '1');
      sendMetricToGrafana('http_post', methodCounts.POST, 'sum', '1');
      sendMetricToGrafana('http_put', methodCounts.PUT, 'sum', '1');
      sendMetricToGrafana('http_delete', methodCounts.DELETE, 'sum', '1');

      // ---- USERS ----
      sendMetricToGrafana('active_users', activeUsers.size, 'gauge', '1');

      // ---- AUTH ----
      sendMetricToGrafana('auth_success', authAttempts.success, 'sum', '1');
      sendMetricToGrafana('auth_failure', authAttempts.failure, 'sum', '1');

      // ---- SYSTEM ----
      sendMetricToGrafana('cpu_usage', cpu, 'gauge', '%');
      sendMetricToGrafana('memory_usage', memory, 'gauge', '%');

      // ---- PIZZAS ----
      sendMetricToGrafana('pizzas_sold', pizzasSold, 'sum', '1');
      sendMetricToGrafana('pizza_failures', pizzaFailures, 'sum', '1');
      sendMetricToGrafana('revenue', revenue, 'sum', 'usd');

      // ---- LATENCY ----
      sendMetricToGrafana('request_latency', avgLatency, 'gauge', 'ms');
      sendMetricToGrafana('pizza_latency', avgPLatency, 'gauge', 'ms');

      resetMetrics();
      //console.log('---------------------------------------------------------------')
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