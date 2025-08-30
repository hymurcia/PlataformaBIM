const { verifyToken } = require('../utils/jwt');

function checkRole(options) {
  const roles = Array.isArray(options) ? options : options.roles || [];
  const strict = typeof options === 'object' && options.strict;

  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
      const token = authHeader.split(' ')[1];
      //console.log('Token recibido:', token);
      const decoded = verifyToken(token);
      //console.log('Token decodificado:', decoded);
      req.user = decoded;

      const userRole = decoded.rol_id;

      if (strict) {
        if (!roles.every(r => r === userRole)) {
          return res.status(403).json({ error: 'Acceso denegado (estricto)' });
        }
      } else {
        if (!roles.includes(userRole)) {
          return res.status(403).json({ error: 'Acceso denegado' });
        }
      }

      next();
    } catch (err) {
      console.error('Error al verificar token:', err.message);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

module.exports = checkRole;
