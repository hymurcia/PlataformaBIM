const express = require('express');
const router = express.Router();
const {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  obtenerRoles,
  eliminarUsuario
} = require('../controllers/adminUsuariosController');
const checkRole = require('../middleware/roles');
const e = require('express');

router.get('/usuarios', checkRole([1, 2]), obtenerUsuarios);
router.post('/usuarios', checkRole([1, 2]), crearUsuario);
router.put('/usuarios/:id', checkRole([1, 2]), actualizarUsuario);
router.delete('/usuarios/:id', checkRole([1, 2]), eliminarUsuario);
router.get('/roles', checkRole([1, 2]), obtenerRoles);

module.exports = router;
