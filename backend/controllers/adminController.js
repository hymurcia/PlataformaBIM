// controllers/adminController.js
const pool = require('../db'); // Ajusta la ruta a tu conexión con PostgreSQL

// Obtener usuarios con paginación y búsqueda
const getUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Consulta con búsqueda y paginación
    const query = {
      text: `
        SELECT u.id, u.nombre, u.email, r.nombre as rol_nombre, r.id as rol_id
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.nombre ILIKE $1 OR u.email ILIKE $1
        ORDER BY u.id
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    // Consulta para el total (para paginación)
    const countQuery = {
      text: `
        SELECT COUNT(*) 
        FROM usuarios u
        WHERE u.nombre ILIKE $1 OR u.email ILIKE $1
      `,
      values: [`%${search}%`]
    };

    const [usersResult, totalResult] = await Promise.all([
      pool.query(query),
      pool.query(countQuery)
    ]);

    res.json({
      users: usersResult.rows,
      total: parseInt(totalResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(totalResult.rows[0].count / limit)
    });
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Panel de administración
const getDashboard = (req, res) => {
  res.send("Panel de administración");
};

// Gestión de contenido
const manageContent = (req, res) => {
  res.json({ message: 'Gestión de contenido' });
};

// Exportar todos juntos (CommonJS)
module.exports = {
  getUsuarios,
  getDashboard,
  manageContent
};
