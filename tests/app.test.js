// tests/app.test.js
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const request = require('supertest');

// Avoid failing tests locally/in CI if S3 env vars aren't set
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'test-bucket';

const app = require('../app');

test('GET / returns dashboard HTML', async () => {
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 200);
  assert.ok(res.text.includes('<title>CloudDeploy S3 File Manager</title>'));
});

test('GET /health returns system metrics', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.cpu);
  assert.ok(res.body.memory);
  assert.ok(res.body.timestamp);
});

test('GET /unknown-route returns 404', async () => {
  const res = await request(app).get('/unknown-route');
  assert.strictEqual(res.status, 404);
});
