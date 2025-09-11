const express = require('express');
const router = express.Router();
const { getWeatherFacatativa, obtenerClimaFacatativa } = require('../controllers/climaController');

// Obtener clima de Facatativá
router.get('/facatativa', obtenerClimaFacatativa);

module.exports = router;
