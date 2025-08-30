const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploads');
const checkRole = require('../middleware/roles');
const authMiddleware = require('../middleware/auth');

const {
  crearReporte,
  crearReporteInvitado,
  obtenerReporte,
  obtenerImagenesReporte,
  actualizarReporte,
  listarReportes
} = require('../controllers/reporteController');

// Crear reporte
router.post('/', authMiddleware, upload.array('imagenes', 5), crearReporte);

// Crear reporte como invitado
router.post('/invitado', upload.array('imagenes', 3), crearReporteInvitado);

// Listar reportes del usuario logueado (rol 4)
router.get('/mis-reportes', checkRole([4]), listarReportes);

// Obtener reporte por ID
router.get('/:id', checkRole([1, 2, 3, 4]), obtenerReporte);
//router.get('/:id', obtenerReporte);

// Obtener imágenes de un reporte
router.get('/:id/imagenes', checkRole([1, 2, 3, 4]), obtenerImagenesReporte);

// Actualizar reporte
router.put('/:id/actualizar', checkRole([2, 3, 4]), actualizarReporte);

// Listar reportes
router.get('/', checkRole([1, 2, 3, 4]), listarReportes);

module.exports = router;
