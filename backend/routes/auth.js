// backend/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registrarUsuario,
  loginUsuario,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// Limitar intentos de forgot
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/registrar', registrarUsuario);

// ==========================================================
// 🚨 MODIFICACIÓN CLAVE: MIDDLEWARE DE DIAGNÓSTICO EN LOGIN 🚨
// ==========================================================
router.post('/login', (req, res, next) => {
    // 1. Log en el router (Si esto aparece, la ruta es correcta)
    console.log('--- RUTA DE LOGIN ALCANZADA EN ROUTER ---');
    next(); // Pasa al siguiente middleware/controlador (loginUsuario)
}, loginUsuario); // <-- Aquí se llama a la función del controlador

router.post('/forgot', forgotLimiter, forgotPassword);
router.post('/reset', resetPassword);

module.exports = router;
