const express = require('express');
const router = express.Router();
const { getUbicaciones } = require('../controllers/ubicacionesController');

// GET /ubicaciones
router.get('/', getUbicaciones);

module.exports = router;
