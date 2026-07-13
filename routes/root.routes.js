// routes/root.routes.js
const express = require('express');
const router = express.Router();
const rootController = require('../controllers/root.controller');

// GET /
router.get('/', rootController.getRoot);

module.exports = router;
