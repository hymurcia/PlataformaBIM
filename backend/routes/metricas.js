const express = require('express');
const router = express.Router();
const { obtenerMetricas } = require('../controllers/metricasController');
const checkRole = require('../middleware/roles');

// Ruta protegida para métricas
router.get('/', checkRole([1, 2]), obtenerMetricas);

module.exports = router;
