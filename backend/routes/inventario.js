const express = require('express');
const router = express.Router();
const { actualizarInventario } = require('../controllers/inventarioController');

// 📦 Ruta para actualizar inventario (sumar cantidad y recalcular costo promedio)
router.put('/:item_id', actualizarInventario);

module.exports = router;
