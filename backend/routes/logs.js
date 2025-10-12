// backend/routes/logs.js
const express = require('express');
const router = express.Router();
const { obtenerLogsUsuarios } = require('../controllers/logsController');

// GET /logs
router.get('/', obtenerLogsUsuarios);

module.exports = router;
