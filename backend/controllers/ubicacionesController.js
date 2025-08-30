const pool = require('../db'); // tu conexión a PostgreSQL

// Obtener todas las ubicaciones
const getUbicaciones = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, area, bloque, piso, salon FROM ubicaciones');
    res.json(result.rows); // devuelve [{ id, nombre }, ...]
  } catch (error) {
    console.error('Error en getUbicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getUbicaciones };
