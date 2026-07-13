// app.js - CloudDeploy API entry point
require('dotenv').config();

const express = require('express');
const path = require('path');
const rootRoutes = require('./routes/root.routes');
const healthRoutes = require('./routes/health.routes');
const fileRoutes = require('./routes/file.routes');
const requestLogger = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.use('/', rootRoutes);
app.use('/health', healthRoutes);
app.use('/', fileRoutes); // exposes /upload and /files

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// --- Centralized Error Handler (must be last) ---
app.use(errorHandler);

// --- Start Server ---
// Only start listening if this file is run directly (allows import in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CloudDeploy API running on port ${PORT} [env: ${process.env.NODE_ENV || 'development'}]`);
  });
}

module.exports = app;
