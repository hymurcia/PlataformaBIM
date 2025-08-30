// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // ✅ Importar conexión a PostgreSQL
const {
  getUsuarios,
  getDashboard,
  manageContent
} = require('../controllers/adminController'); // ✅ Importar funciones de controlador
const checkRole = require('../middleware/roles');

// =========================
// Obtener usuarios (solo roles 1 y 2 pueden acceder)
// =========================
router.get('/usuarios', checkRole([1, 2]), getUsuarios);

// =========================
// Cambiar rol de usuario (solo roles 1 y 2)
// =========================
router.put('/usuarios/:id/rol', checkRole([1, 2]), async (req, res) => {
  try {
    const { id } = req.params;
    const { rol_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET rol_id = $1 
       WHERE id = $2 
       RETURNING id, nombre, email, rol_id`,
      [rol_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Rol actualizado correctamente', user: rows[0] });
  } catch (err) {
    console.error('❌ Error al actualizar rol:', err.message);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// =========================
// Obtener lista de roles
// =========================
router.get('/roles', checkRole([1, 2]), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM roles ORDER BY id`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener roles:', err.message);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// =========================
// Panel de administración
// =========================
router.get('/dashboard', checkRole([1, 2]), getDashboard);

// =========================
// Gestión de contenido
// =========================
router.get('/content/manage', checkRole([1, 2]), manageContent);

module.exports = router;
