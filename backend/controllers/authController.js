const pool = require('../db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

const saltRounds = 10;

// =========================
// Registro de usuario
// =========================
const registrarUsuario = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, password } = req.body;

    if (!nombre || !apellido || !telefono || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const rol_id = 4; // Rol por defecto al registrarse

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, telefono, email, password, rol_id) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, apellido, telefono, email, rol_id, fecha_creacion`,
      [nombre, apellido, telefono, email, hashedPassword, rol_id]
    );

    const token = generateToken({
      id: rows[0].id,
      email: rows[0].email,
      rol_id: rows[0].rol_id
    });

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      token,
      user: rows[0]
    });

  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
      res.status(400).json({ error: 'El email ya está registrado' });
    } else {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};

// =========================
// Login
// =========================
const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.password, u.rol_id, r.nombre AS rol_nombre 
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = generateToken({
      id: user.id,
      email: user.email,
      rol_id: user.rol_id
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { registrarUsuario, loginUsuario };
