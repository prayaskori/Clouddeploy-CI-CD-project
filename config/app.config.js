// config/app.config.js
// Centralized application configuration and environment variable validation.

const REQUIRED_ENV_VARS = ['AWS_REGION', 'S3_BUCKET_NAME'];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(
      `[config/app.config] Missing environment variables: ${missing.join(', ')}. ` +
      'The API will still start, but related features may fail at runtime.'
    );
  }
}

validateEnv();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
};
