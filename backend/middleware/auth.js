// middleware/auth.js
const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded; // ahora req.user.id estará disponible
    next();
  } catch (err) {
    console.error('JWT inválido:', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;
