const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const checkRole = require('../middleware/roles');

const {
  crearIncidente,
  crearIncidenteInvitado,
  obtenerDetalleIncidente,
  obtenerIncidenteById,
  obtenerImagenesIncidente,
  actualizarEstadoIncidente
} = require('../controllers/incidenteController');

// Reportar incidente (usuario autenticado)
router.post('/', upload.array('imagenes', 5), crearIncidente);

// Reportar incidente como invitado
router.post('/invitado', upload.array('imagenes', 3), crearIncidenteInvitado);

// rutas/incidentes.js
router.get('/asignacion/:id', checkRole([1, 2, 3, 4]), obtenerDetalleIncidente);

// Obtener incidente por ID
router.get('/:id', checkRole([1, 2, 3, 4]), obtenerIncidenteById);

// Obtener imágenes de un incidente
router.get('/:id/imagenes', checkRole([1, 2, 3, 4]), obtenerImagenesIncidente);

// Cambiar estado de incidente
router.put('/:id/estado', checkRole([1, 2]), actualizarEstadoIncidente);

module.exports = router;
