// routes/file.routes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const fileController = require('../controllers/file.controller');

// POST /upload - accepts a single file field named "file"
router.post('/upload', upload.single('file'), fileController.uploadFile);

// GET /files - lists every uploaded file in the S3 bucket
router.get('/files', fileController.listFiles);

// GET /files/download - downloads a file using its S3 key
router.get('/files/download', fileController.downloadFile);

module.exports = router;
