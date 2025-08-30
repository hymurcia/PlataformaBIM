// routes/mantenimientosRoutes.js
const express = require('express');
const router = express.Router();
const mantenimientosController = require('../controllers/mantenimientosController');

// Rutas CRUD
router.get('/', mantenimientosController.getMantenimientos);
router.get('/mis-mantenimientos', mantenimientosController.getMisMantenimientos);
router.get('/:id', mantenimientosController.getMantenimientoById);
router.post('/', mantenimientosController.createMantenimiento);
router.put('/:id/estado', mantenimientosController.updateMantenimientoEstado);
router.put('/:id', mantenimientosController.updateMantenimiento);
router.delete('/:id', mantenimientosController.deleteMantenimiento);
module.exports = router;
