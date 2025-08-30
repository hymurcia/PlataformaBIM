const express = require('express');
const router = express.Router();
const { obtenerPerfil } = require('../controllers/perfilController');

router.get('/', obtenerPerfil);

module.exports = router;
