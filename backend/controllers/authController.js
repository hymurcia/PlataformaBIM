const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { generateToken } = require('../utils/jwt');
import facatativa2 from '../assets/facatativa-2.jpg';
const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

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
    const rol_id = 4; // Rol por defecto

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
    console.error('ERROR registrarUsuario:', err.message);
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

    // Consultar usuario
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.telefono, u.email, u.password, u.rol_id, r.nombre AS rol_nombre 
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Validar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Generar token
    const token = generateToken({
      id: user.id,
      email: user.email,
      rol_id: user.rol_id
    });

    // // Log de ingreso exitoso
     await pool.query(
       `INSERT INTO logs (usuario_id, accion) VALUES ($1, $2)`,
       [user.id, 'Ingreso exitoso al sistema']
     );

    // Retornar datos sin la contraseña
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('ERROR loginUsuario:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// =========================
// Forgot Password
// =========================
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  try {
    console.log('📩 Solicitud de restablecimiento recibida para:', email);

    // Buscar usuario por correo
    const userQ = await pool.query('SELECT id, nombre FROM usuarios WHERE email = $1', [email]);
    console.log('🔍 Resultado consulta usuario:', userQ.rowCount);

    if (userQ.rowCount > 0) {
      const usuarioId = userQ.rows[0].id;

      // Generar token y hash
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiryHours = Number(process.env.RESET_TOKEN_EXP_HOURS || 1);
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      console.log('🆔 Usuario ID:', usuarioId);
      console.log('⏰ Expira en:', expiresAt);

      // Guardar token en BD
      await pool.query(
        `INSERT INTO password_resets (usuario_id, token_hash, expires_at, used) 
         VALUES ($1, $2, $3, false)`,
        [usuarioId, tokenHash, expiresAt]
      );
      console.log('💾 Token almacenado correctamente en DB.');

      // Generar URL para restablecer
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
      console.log('🔗 URL de restablecimiento generada:', resetUrl);

      // Crear transporte Gmail seguro
      const transporter = nodemailer.createTransport({
        service: 'gmail', // ⚡ Gmail simplifica la configuración SMTP
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // contraseña de aplicación
        },
      });

      // Verificar conexión SMTP
      await transporter.verify()
        .then(() => console.log('✅ Conexión SMTP correcta con Gmail'))
        .catch((err) => {
          console.error('❌ Error autenticando con Gmail:', err);
          throw new Error('No se pudo conectar con el servidor de correo');
        });

      // Opciones del correo
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Restablecer contraseña - Plataforma BIM',
        text: `Hola,\n\nSolicitaste restablecer tu contraseña. Haz clic en el siguiente enlace (válido por ${expiryHours} hora(s)):\n\n${resetUrl}\n\nSi no solicitaste esto, puedes ignorar este correo.`,
        html: `
          <p>Hola,</p>
          <p>Solicitaste restablecer tu contraseña. Haz clic en el siguiente enlace (válido por ${expiryHours} hora(s)):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Si no solicitaste esto, puedes ignorar este correo.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Este mensaje fue generado automáticamente por la Plataforma BIM.</p>
        `,
      };

      // Enviar correo
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado correctamente:', info.messageId);
    }

    return res.json({
      message:
        'Si ese correo existe en nuestro sistema, hemos enviado un enlace para restablecer la contraseña.',
    });
  } catch (err) {
    console.error('❌ ERROR forgotPassword:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};

// =========================
// Reset Password
// =========================
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password)
    return res.status(400).json({ error: 'Token y contraseña son requeridos' });
  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  try {
    console.log('🔐 Intentando restablecer contraseña con token recibido.');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Validar token
    const tokenQ = await pool.query(
      `SELECT id, usuario_id FROM password_resets 
       WHERE token_hash = $1 AND used = false AND expires_at > NOW()`,
      [tokenHash]
    );

    console.log('🧩 Tokens válidos encontrados:', tokenQ.rowCount);

    if (tokenQ.rowCount === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const resetRow = tokenQ.rows[0];
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('🔑 Contraseña encriptada, actualizando en BD para usuario:', resetRow.usuario_id);

    // Actualizar contraseña
    await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [
      passwordHash,
      resetRow.usuario_id,
    ]);

    // Marcar token como usado y limpiar tokens anteriores
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [resetRow.id]);
    await pool.query('DELETE FROM password_resets WHERE usuario_id = $1 AND used = true', [
      resetRow.usuario_id,
    ]);

    console.log('✅ Contraseña actualizada correctamente y tokens limpiados.');

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('❌ ERROR resetPassword:', err);
    return res.status(500).json({ error: 'Error del servidor' });
  }
};



module.exports = {
  registrarUsuario,
  loginUsuario,
  forgotPassword,
  resetPassword
};
