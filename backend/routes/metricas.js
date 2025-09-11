const express = require('express');
const router = express.Router();
const { 
  obtenerMetricas, 
  obtenerMetricasMantenimientos 
} = require('../controllers/metricasController');
const checkRole = require('../middleware/roles');

// 📊 Métricas de incidentes
router.get('/incidentes', checkRole([1, 2]), obtenerMetricas);

// 🛠️ Métricas de mantenimientos
router.get('/mantenimientos', checkRole([1, 2]), obtenerMetricasMantenimientos);

module.exports = router;
