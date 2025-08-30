const express = require('express');
const router = express.Router();
const { getMantenimientoDecision } = require('../controllers/predictivoController');

// Endpoint POST: frontend envía fecha_programada
router.get('/mantenimiento', getMantenimientoDecision);

module.exports = router;
