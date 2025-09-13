const express = require("express");
const router = express.Router();
const {
  crearNotificacion,
  obtenerNotificaciones,
  marcarLeida,
} = require("../controllers/notificacionesController");

// Crear notificación
router.post("/", crearNotificacion);

// Obtener todas las notificaciones de un usuario
router.get("/:usuario_id", obtenerNotificaciones);

// Marcar una notificación como leída
router.put("/:id/leida", marcarLeida);

module.exports = router;
