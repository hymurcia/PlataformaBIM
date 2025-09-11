const pool = require('../db');
const bcrypt = require('bcrypt');

// 1. Obtener usuarios (paginado + búsqueda)
const obtenerUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const query = {
      text: `
        SELECT id, nombre, apellido, telefono, email, rol_id, fecha_creacion
        FROM usuarios
        WHERE (nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1)
        ORDER BY id
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    const countQuery = {
      text: `SELECT COUNT(*) FROM usuarios 
             WHERE (nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1)`,
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
    const { nombre, apellido, telefono, email, password, rol_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, telefono, email, password, rol_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, apellido, telefono, email, rol_id, fecha_creacion`,
      [nombre, apellido, telefono, email, hashedPassword, rol_id]
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
    const { nombre, apellido, telefono, email, rol_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, apellido = $2, telefono = $3, email = $4, rol_id = $5
       WHERE id = $6
       RETURNING id, nombre, apellido, telefono, email, rol_id, fecha_creacion`,
      [nombre, apellido, telefono, email, rol_id, id]
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

// 4. Eliminar usuario (DELETE físico)
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM usuarios WHERE id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Error en eliminarUsuario:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario' });
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
  eliminarUsuario,
  obtenerRoles
};
