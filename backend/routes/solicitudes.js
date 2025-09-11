const express = require("express");
const router = express.Router();
const { crearSolicitud, obtenerSolicitudes } = require("../controllers/solicitudesController");

// Crear nueva solicitud
router.post("/", crearSolicitud);

// Obtener todas las solicitudes
router.get("/", obtenerSolicitudes);

module.exports = router;
