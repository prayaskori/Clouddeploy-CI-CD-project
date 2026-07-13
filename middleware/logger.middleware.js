// middleware/logger.middleware.js
// Simple structured request logger. In a real production system this could
// be swapped for winston/pino and shipped to CloudWatch Logs.

function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });

  next();
}

module.exports = requestLogger;
