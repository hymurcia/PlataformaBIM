const express = require('express');
const router = express.Router();
const { getWeatherFacatativa } = require('../controllers/climaController');

// Obtener clima de Facatativá
router.get('/facatativa', getWeatherFacatativa);

module.exports = router;
