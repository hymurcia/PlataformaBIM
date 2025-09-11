const express = require('express');
const router = express.Router();
const componentesController = require('../controllers/componentesController');

// Usar las funciones del controlador correctamente
router.get("/", componentesController.obtenerComponentes);
router.get("/:id", componentesController.obtenerComponenteById);
router.post("/", componentesController.crearComponente);
router.put("/:id", componentesController.actualizarComponente);
router.delete("/:id", componentesController.eliminarComponente);


module.exports = router;
