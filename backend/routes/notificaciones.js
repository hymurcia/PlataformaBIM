const express = require("express");
const router = express.Router();
const { obtenerNotificaciones } = require("../controllers/notificacionesController");

router.get("/", obtenerNotificaciones);

module.exports = router;
