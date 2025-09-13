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
router.post('/login', loginUsuario);
router.post('/forgot', forgotLimiter, forgotPassword);
router.post('/reset', resetPassword);

module.exports = router;
