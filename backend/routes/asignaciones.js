// routes/asignaciones.js
const express = require('express');
const router = express.Router();
const {
  asignarResponsable,
  obtenerResponsables,
  obtenerMisAsignaciones,
  actualizarAsignacion
} = require('../controllers/asignacionesController');
const checkRole = require('../middleware/roles');

// =========================
// Rutas de Asignaciones
// =========================

// Obtener responsables activos (solo admin y supervisor)
router.get('/responsables', checkRole([1, 2]), obtenerResponsables);

// Obtener las asignaciones del usuario autenticado (todos los roles con acceso)
router.get('/mis-asignaciones', checkRole([1, 2, 3, 4]), obtenerMisAsignaciones);

// Actualizar estado de una asignación (responsable asignado o admin/supervisor)
router.put('/:id', checkRole([1, 2, 3, 4]), actualizarAsignacion);

// Asignar un responsable a un incidente (solo admin y supervisor)
router.post('/', checkRole([1, 2]), asignarResponsable);

module.exports = router;
