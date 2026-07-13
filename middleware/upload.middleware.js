// middleware/upload.middleware.js
// Handles multipart/form-data file uploads in-memory before streaming to S3.
// Using memoryStorage avoids writing untrusted files to local disk.

const multer = require('multer');
const appConfig = require('../config/app.config');

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/octet-stream',
];

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${file.mimetype}`);
    error.statusCode = 400;
    cb(error, false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.maxUploadSizeMb * 1024 * 1024,
  },
});

module.exports = upload;
