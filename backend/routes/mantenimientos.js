// routes/mantenimientosRoutes.js
const express = require('express');
const router = express.Router();
const mantenimientosController = require('../controllers/mantenimientosController');
const checkRole = require('../middleware/roles');

// Rutas CRUD
router.get('/', mantenimientosController.obtenerMantenimientos);
// Obtener los mantenimientos del usuario autenticado
router.get('/mis-mantenimientos',mantenimientosController.obtenerMisMantenimientos);
router.get('/:id', mantenimientosController.obtenerMantenimientoById);
router.post('/', mantenimientosController.crearMantenimiento);
router.put('/:id/estado', mantenimientosController.actualizarMantenimientoEstado);
router.put('/:id', mantenimientosController.actualizarMantenimiento);
router.delete('/:id', mantenimientosController.eliminarMantenimiento);
module.exports = router;
