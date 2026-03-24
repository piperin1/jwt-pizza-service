const config = require('./config.js');

function sendLogToLoki(labels, logLine) {
  const log = {
    streams: [
      {
        stream: labels,
        values: [
          [
            (Math.floor(Date.now() / 1000) * 1000000000).toString(),
            logLine,
          ],
        ],
      },
    ],
  };

  fetch(`${config.logging.endpointUrl}`, {
    method: 'POST',
    body: JSON.stringify(log),
    headers: {
      Authorization: `Bearer ${config.logging.accountId}:${config.logging.apiKey}`,
      'Content-Type': 'application/json',
    },
  }).catch((err) => {
    console.error('Error sending log:', err);
  });
}

function sanitize(data) {
  if (!data) return data;

  let obj = typeof data === 'string' ? { value: data } : data;

  let str = JSON.stringify(obj)
    .replace(/"password":"[^"]*"/gi, '"password":"***"')
    .replace(/"token":"[^"]*"/gi, '"token":"***"')
    .replace(/"authorization":"[^"]*"/gi, '"authorization":"***"');

  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function httpLogger(req, res, next) {
  const hasAuth = !!req.headers.authorization;
  const start = Date.now();

  let responseBody;

  const originalSend = res.send;
  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const logLine = JSON.stringify({
      type: 'http',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      hasAuth,
      requestBody: sanitize(req.body),
      responseBody: sanitize(responseBody),
      latency: Date.now() - start,
    });

    sendLogToLoki(
      {
        service: 'pizza-service',
        category: 'http',
        source: 'jwt-pizza-service-dev',
      },
      logLine
    );
  });

  next();
}

function logDbQuery(query) {
  sendLogToLoki(
    {
      service: 'pizza-service',
      category: 'database',
      source: 'jwt-pizza-service-dev',
    },
    JSON.stringify({
      type: 'db',
      query: sanitize(query),
    })
  );
}

function logFactoryRequest(requestBody, responseBody) {
  sendLogToLoki(
    {
      service: 'pizza-service',
      category: 'factory',
      source: 'jwt-pizza-service-dev',
    },
    JSON.stringify({
      type: 'factory',
      request: sanitize(requestBody),
      response: sanitize(responseBody),
    })
  );
}

function logError(error) {
  sendLogToLoki(
    {
      service: 'pizza-service',
      category: 'error',
      source: 'jwt-pizza-service-dev',
    },
    JSON.stringify({
      type: 'error',
      message: error.message,
      stack: error.stack,
    })
  );
}

process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

module.exports = {
  httpLogger,
  logDbQuery,
  logFactoryRequest,
  logError,
};