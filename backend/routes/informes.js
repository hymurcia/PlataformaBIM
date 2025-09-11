const express = require("express");
const router = express.Router();
const { obtenerAuditoria, generarPDF } = require("../controllers/informesController");

// Endpoint JSON
router.get("/", obtenerAuditoria);

// Endpoint PDF
router.get("/pdf", generarPDF);

module.exports = router;
