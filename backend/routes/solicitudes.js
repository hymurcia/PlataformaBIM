// routes/solicitudes.js
const express = require("express");
const router = express.Router();
const {
  crearSolicitud,
  obtenerSolicitudes,
  aprobarSolicitud,
  regenerarPDF,
} = require("../controllers/solicitudesController");
const authMiddleware = require("../middleware/auth"); // ✅ Importar el middleware

// 🔐 Rutas protegidas
router.post("/", authMiddleware, crearSolicitud);
router.get("/", authMiddleware, obtenerSolicitudes);
router.put("/:id/regenerar-pdf", authMiddleware, regenerarPDF);
router.put("/:id/aprobar", authMiddleware, aprobarSolicitud);


module.exports = router;
