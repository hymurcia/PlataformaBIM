const pool = require('../db');
const bcrypt = require('bcrypt');

// 1. Obtener usuarios (paginado + búsqueda)
const obtenerUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const query = {
      text: `
        SELECT id, nombre, email, rol_id, activo 
        FROM usuarios 
        WHERE (nombre ILIKE $1 OR email ILIKE $1)
        ORDER BY id
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    const countQuery = {
      text: `SELECT COUNT(*) FROM usuarios 
             WHERE (nombre ILIKE $1 OR email ILIKE $1)`,
      values: [`%${search}%`]
    };

    const [users, total] = await Promise.all([
      pool.query(query),
      pool.query(countQuery)
    ]);

    res.json({
      users: users.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (err) {
    console.error('Error en obtenerUsuarios:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// 2. Crear usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol_id, activo = true } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol_id, activo`,
      [nombre, email, hashedPassword, rol_id, activo]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email ya registrado' });
    } else {
      console.error('Error en crearUsuario:', err.message);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
};

// 3. Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol_id, activo } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, email = $2, rol_id = $3, activo = $4
       WHERE id = $5
       RETURNING id, nombre, email, rol_id, activo`,
      [nombre, email, rol_id, activo, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error en actualizarUsuario:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// 4. Desactivar usuario (soft delete)
const desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET activo = false 
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    console.error('Error en desactivarUsuario:', err.message);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
};

// 5. Obtener roles disponibles
const obtenerRoles = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error en obtenerRoles:', err.message);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  obtenerRoles
};
