const express = require('express');
const router = express.Router();
const { obtenerUbicaciones } = require('../controllers/ubicacionesController');

// GET /ubicaciones
router.get('/', obtenerUbicaciones);


module.exports = router;
