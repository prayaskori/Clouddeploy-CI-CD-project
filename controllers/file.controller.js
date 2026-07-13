// controllers/file.controller.js
const crypto = require('crypto');
const {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../config/s3.config');

// POST /upload - streams the uploaded file buffer directly to S3
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('No file provided. Attach a file using the "file" field.');
      error.statusCode = 400;
      throw error;
    }

    if (!BUCKET_NAME) {
      const error = new Error('S3_BUCKET_NAME is not configured on the server.');
      error.statusCode = 500;
      throw error;
    }

    const uniquePrefix = crypto.randomUUID();
    const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${uniquePrefix}-${safeOriginalName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ServerSideEncryption: 'AES256', // encrypt at rest
      })
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        key,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /files - lists all objects currently stored in the S3 bucket
async function listFiles(req, res, next) {
  try {
    if (!BUCKET_NAME) {
      const error = new Error('S3_BUCKET_NAME is not configured on the server.');
      error.statusCode = 500;
      throw error;
    }

    const data = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'uploads/',
      })
    );

    const files = (data.Contents || []).map((obj) => ({
      key: obj.Key,
      sizeBytes: obj.Size,
      lastModified: obj.LastModified,
    }));

    res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    next(err);
  }
}

// GET /files/download - retrieves a file from S3 and streams it to the client
async function downloadFile(req, res, next) {
  try {
    const { key } = req.query;
    if (!key) {
      const error = new Error('File key is required. Pass it using the "key" query parameter.');
      error.statusCode = 400;
      throw error;
    }

    if (!BUCKET_NAME) {
      const error = new Error('S3_BUCKET_NAME is not configured on the server.');
      error.statusCode = 500;
      throw error;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const data = await s3Client.send(command);

    res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
    
    // Extract filename from S3 key (stripping prefix and random UUID prefix)
    const displayName = key.replace(/^uploads\/[a-f0-9-]{36}-/, '') || key.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`);

    data.Body.pipe(res);
  } catch (err) {
    next(err);
  }
}

// DELETE /files - deletes a file from S3 using its key
async function deleteFile(req, res, next) {
  try {
    const { key } = req.query;
    if (!key) {
      const error = new Error('File key is required. Pass it using the "key" query parameter.');
      error.statusCode = 400;
      throw error;
    }

    if (!BUCKET_NAME) {
      const error = new Error('S3_BUCKET_NAME is not configured on the server.');
      error.statusCode = 500;
      throw error;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile, listFiles, downloadFile, deleteFile };
