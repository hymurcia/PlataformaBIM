const pool = require('../db');
// Eliminamos bcryptjs, ya que causaba problemas.
// const bcrypt = require('bcryptjs'); 
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { generateToken } = require('../utils/jwt');

// Configuración de scrypt (recomendada para un hash seguro)
const scryptConfig = {
    N: 16384, // Factor de costo (iteraciones)
    r: 8,     // Tamaño del bloque
    p: 1,     // Paralelismo
    keylen: 64, // Longitud de la clave (Hash)
    saltlen: 16, // Longitud del salt (fijo)
};

// =========================
// Función de utilidad para scrypt (Registrar)
// Formato de almacenamiento: salt:hash
// =========================
const hashPasswordScrypt = (password) => {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, crypto.randomBytes(scryptConfig.saltlen), scryptConfig.keylen, scryptConfig, (err, derivedKey) => {
            if (err) return reject(err);
            // El salt real está contenido en los primeros bytes de derivedKey
            const salt = derivedKey.slice(0, scryptConfig.saltlen).toString('hex');
            const hash = derivedKey.toString('hex');
            // Almacenamos el salt junto con el hash para la comparación
            resolve(`${salt}:${hash}`);
        });
    });
};

// =========================
// Función de utilidad para scrypt (Login)
// =========================
const comparePasswordScrypt = (password, storedHash) => {
    return new Promise((resolve, reject) => {
        const parts = storedHash.split(':');
        
        // Verifica que el hash almacenado tenga el formato scrypt (salt:hash)
        if (parts.length !== 2) {
            // Este caso atrapará hashes viejos de bcrypt y los rechazará
            return resolve(false); 
        }
        
        const [saltHex, keyHex] = parts;
        const salt = Buffer.from(saltHex, 'hex');

        crypto.scrypt(password, salt, scryptConfig.keylen, scryptConfig, (err, derivedKey) => {
            if (err) return reject(err);

            const hash = derivedKey.toString('hex');
            // Comparamos el hash generado con el hash almacenado
            resolve(hash === keyHex); 
        });
    });
};

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

    // 🚨 Usamos la nueva función de hashing con scrypt
    const hashedPassword = await hashPasswordScrypt(password);
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
    // 🚨 Logs de diagnóstico eliminados para la versión final
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // 2. Consultar usuario (Consulta robusta con rol si es necesario)
    const { rows } = await pool.query(
        'SELECT u.id, u.nombre, u.email, u.password, u.rol_id, r.nombre AS rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE u.email = $1',
        [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    
    // Verificación defensiva
    if (!user.password) {
        console.error("Usuario encontrado pero la contraseña está vacía/null en DB:", user.id);
        return res.status(500).json({ error: 'Error interno de autenticación (Hash faltante)' });
    }

    // Limpiamos el hash de la base de datos (CRUCIAL)
    const storedHash = user.password.trim(); 
    
    // 🚨 Usamos la nueva función de comparación con scrypt
    const validPassword = await comparePasswordScrypt(password, storedHash);

    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Generar token
    const token = generateToken({
      id: user.id,
      email: user.email,
      rol_id: user.rol_id
    });

    // Retornar datos sin la contraseña
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });

  } catch (err) { // 🚨 Corregida la sintaxis del catch
    console.error('❌ FATAL ERROR loginUsuario (scrypt):', err.message);
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
    
    // 🚨 Usamos scrypt para el nuevo hash de contraseña
    const passwordHash = await hashPasswordScrypt(password);

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
