const express = require("express");
const router = express.Router();
const {
  obtenerComponentes,
  obtenerComponenteById,
  crearComponente,
  actualizarComponente,
  eliminarComponente,
  darDeBajaComponente,
} = require("../controllers/componentesController");

// Rutas principales
router.get("/", obtenerComponentes);
router.get("/:id", obtenerComponenteById);
router.post("/", crearComponente);
router.put("/:id", actualizarComponente);
router.delete("/:id", eliminarComponente);

// Nueva ruta: dar de baja un componente y asignar reemplazo
router.put("/:id/baja", darDeBajaComponente);

module.exports = router;
