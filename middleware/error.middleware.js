// middleware/error.middleware.js
// Centralized error-handling middleware. Must be registered last in app.js.

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  const statusCode = err.statusCode || 500;
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
