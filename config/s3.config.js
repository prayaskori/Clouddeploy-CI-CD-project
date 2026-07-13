// config/s3.config.js
// Centralized AWS S3 client configuration.
// Credentials are NEVER hardcoded here. In production on EC2, the AWS SDK
// automatically resolves credentials from the attached IAM Instance Role
// via the EC2 Instance Metadata Service (IMDS). Locally, it falls back to
// the AWS CLI credentials chain (~/.aws/credentials) or env vars for testing.

const { S3Client } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  console.warn('[config/s3.config] WARNING: S3_BUCKET_NAME is not set in environment variables.');
}

// No explicit credentials block: the SDK's default credential provider chain
// automatically uses the IAM Role attached to the EC2 instance in production.
const s3Client = new S3Client({
  region: REGION,
});

module.exports = {
  s3Client,
  BUCKET_NAME,
  REGION,
};
