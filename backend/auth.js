const jwt = require('jsonwebtoken');
require('dotenv').config();

const secretKey = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      rol_id: user.rol_id  // ← Esto debe coincidir
    },
    secretKey,
    { expiresIn: '1h' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, secretKey);
};

module.exports = { generateToken, verifyToken };