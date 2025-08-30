// routes/asignaciones.js
const express = require('express');
const router = express.Router();
const {
  asignarResponsable,
  getResponsables,
  getMisAsignaciones,
  updateAsignacion
} = require('../controllers/asignacionesController');
const checkRole = require('../middleware/roles');

// =========================
// Rutas de Asignaciones
// =========================

// Obtener responsables activos (solo admin y supervisor)
router.get('/responsables', checkRole([1, 2]), getResponsables);

// Obtener las asignaciones del usuario autenticado (todos los roles con acceso)
router.get('/mis-asignaciones', checkRole([1, 2, 3, 4]), getMisAsignaciones);

// Actualizar estado de una asignación (responsable asignado o admin/supervisor)
router.put('/:id', checkRole([1, 2, 3, 4]), updateAsignacion);

// Asignar un responsable a un incidente (solo admin y supervisor)
router.post('/', checkRole([1, 2]), asignarResponsable);

module.exports = router;
