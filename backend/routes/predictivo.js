const express = require('express');
const router = express.Router();
const { getMantenimientoDecision, obtenerMantenimientoDecision } = require('../controllers/predictivoController');

// Endpoint POST: frontend envía fecha_programada
router.get('/mantenimiento', obtenerMantenimientoDecision);

module.exports = router;
