// backend/controllers/logsController.js
const pool = require('../db'); // tu pool de PostgreSQL

// Obtener logs de usuarios
const obtenerLogsUsuarios = async (req, res) => {
  try {
    const query = `
      SELECT l.id, l.usuario_id, u.nombre, u.apellido, l.accion, l.fecha
      FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.fecha DESC
      LIMIT 100
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error obteniendo logs' });
  }
};

module.exports = { obtenerLogsUsuarios };
