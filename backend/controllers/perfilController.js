const pool = require('../db');
const { verifyToken } = require('../utils/jwt');

const obtenerPerfil = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol_id, r.nombre AS rol_nombre 
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { obtenerPerfil };
