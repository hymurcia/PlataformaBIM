const express = require('express');
const router = express.Router();
const {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  obtenerRoles
} = require('../controllers/adminUsuariosController');
const checkRole = require('../middleware/roles');

router.get('/usuarios', checkRole([1, 2]), obtenerUsuarios);
router.post('/usuarios', checkRole([1, 2]), crearUsuario);
router.put('/usuarios/:id', checkRole([1, 2]), actualizarUsuario);
router.delete('/usuarios/:id', checkRole([1, 2]), desactivarUsuario);
router.get('/roles', checkRole([1, 2]), obtenerRoles);

module.exports = router;
