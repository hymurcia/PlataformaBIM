const express = require('express');
const router = express.Router();
const { actualizarInventario, obtenerInventario } = require('../controllers/inventarioController');

router.get('/', obtenerInventario);

//Ruta para actualizar inventario (sumar cantidad y recalcular costo promedio)
router.put('/:item_id', actualizarInventario);

module.exports = router;
