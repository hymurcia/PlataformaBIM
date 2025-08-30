const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/authController');

// POST /auth/registrar
router.post('/registrar', registrarUsuario);

// POST /auth/login
router.post('/login', loginUsuario);

module.exports = router;
