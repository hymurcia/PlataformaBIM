const express = require('express');
const router = express.Router();
const { obtenerUbicaciones, crearUbicaciones } = require('../controllers/ubicacionesController');

// GET /ubicaciones
router.get('/', obtenerUbicaciones);

// Crear nueva ubicación
router.post("/",crearUbicaciones);

module.exports = router;
