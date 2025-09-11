const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Importar controladores
const {
  obtenerItems,
  crearItem,
  actualizarItem,
  eliminarItem,
  actualizarInventario,
} = require("../controllers/itemController");

// =============================
// Configuración de Multer (uploads de imágenes)
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    // Nombre único para la imagen
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// =============================
// Rutas
// =============================

// Obtener todos los items con inventario
router.get("/", obtenerItems);

// Crear item (con imagen opcional)
router.post("/", upload.single("imagen"), crearItem);

// Actualizar item (con imagen opcional)
router.put("/:id", upload.single("imagen"), actualizarItem);

// Eliminar item
router.delete("/:id", eliminarItem);

// Actualizar inventario (promedio ponderado)
router.put("/:item_id/inventario", actualizarInventario);

module.exports = router;
