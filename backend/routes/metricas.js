const express = require('express');
const router = express.Router();
const { 
  obtenerMetricas, 
  obtenerMetricasMantenimientos,
  obtenerMetricasOperativo
} = require('../controllers/metricasController');
const checkRole = require('../middleware/roles');

// 📊 Métricas de incidentes
router.get('/incidentes', checkRole([1, 2]), obtenerMetricas);

// 🛠️ Métricas de mantenimientos
router.get('/mantenimientos', checkRole([1, 2]), obtenerMetricasMantenimientos);

// 🛠️ Métricas de operativo
router.get('/operativo/:id', obtenerMetricasOperativo);

module.exports = router;
