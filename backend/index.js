const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const { generateToken, verifyToken } = require('./auth');
const checkRole = require('./middleware/roles');
const path = require('path');
const app = express();
const saltRounds = 10;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
// Middleware para establecer UTF-8 en todas las respuestas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// =========================
// Registro de usuario
// =========================
app.post('/registrar', async (req, res) => {
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
    const rol_id = 1; // Rol por defecto al registrarse

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
});


// =========================
// Login
// =========================
app.post('/login', async (req, res) => {
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
});

// =========================
// Perfil
// =========================
app.get('/perfil', async (req, res) => {
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

    res.json({ ...rows[0] });

  } catch (err) {
    console.error(err.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// =========================
// Usuarios (administrador)
// =========================
app.get('/admin/usuarios', checkRole([1, 2]), async (req, res) => {
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
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// =========================
// Cambiar rol (admin)
// =========================
app.put('/admin/usuarios/:id/rol', checkRole([1, 2]), async (req, res) => {
  try {
    const { id } = req.params;
    const { rol_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuarios SET rol_id = $1 WHERE id = $2 
       RETURNING id, nombre, email, rol_id`,
      [rol_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Rol actualizado', user: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// =========================
// Obtener roles
// =========================
app.get('/roles', checkRole([1, 2]), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM roles ORDER BY id`);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// =========================
// Vistas protegidas
// =========================
app.get('/admin/dashboard', checkRole([1, 2]), (req, res) => {
  res.json({ message: 'Panel de administración' });
});

app.get('/content/manage', checkRole([1, 2]), (req, res) => {
  res.json({ message: 'Gestión de contenido' });
});

// ========================
// Ubicaciones
// ========================
app.get('/ubicaciones', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre FROM ubicaciones');
    res.json(result.rows); // Ahora devuelve objetos con { id, nombre }
  } catch (error) {
    console.error('Error en /ubicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =========================
// Incidentes
// =========================

// Configura Multer para subir imágenes
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Crea una carpeta 'uploads'

// Endpoint corregido para reportar incidentes
app.post('/incidentes', upload.array('imagenes', 5), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Archivos recibidos:', req.files?.length || 0);

    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;
    const solicitante_id = req.headers['user-id'] ? parseInt(req.headers['user-id'], 10) : null;
    const fechaActual = new Date().toISOString();

    // Validar campos obligatorios
    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos marcados con * son requeridos' });
    }

    // Validar que ubicacion_id sea número
    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: 'ID de ubicación inválido' });
    }

    const insertQuery = `
      INSERT INTO incidentes 
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const valores = [
      titulo, descripcion, tipo, ubicacionIdNum, fechaActual,
      'pendiente', solicitante_id, gravedad
    ];

    const result = await pool.query(insertQuery, valores);
    const incidenteId = result.rows[0].id;

    // Guardar imágenes asociadas
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          'INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)',
          [incidenteId, url, `Imagen de ${titulo}`]
        );
      }
    }

    res.status(201).json({
      message: 'Incidente reportado con éxito',
      incidente: result.rows[0]
    });

  } catch (err) {
    console.error('Error al reportar incidente:', err);

    let mensajeError = 'Error al reportar incidente';
    switch (err.code) {
      case '23505': mensajeError = 'Incidente duplicado'; break;
      case '23503': mensajeError = 'ID de ubicación no existe'; break;
      case '42P01': mensajeError = 'Tabla no encontrada'; break;
      case '42703': mensajeError = 'Columna no encontrada'; break;
    }

    res.status(500).json({
      error: mensajeError,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Ruta: Crear incidente como invitado
app.post('/incidentes/invitado', upload.array('imagenes', 3), async (req, res) => {
  try {
    if (req.headers['user-id']) {
      return res.status(403).json({ error: 'Esta ruta es solo para invitados' });
    }

    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;

    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: 'ID de ubicación inválido' });
    }

    const fechaActual = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO incidentes 
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
       RETURNING *`,
      [titulo, descripcion, tipo, ubicacionIdNum, fechaActual, 'pendiente', gravedad]
    );

    const incidenteId = rows[0].id;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          'INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)',
          [incidenteId, url, `Imagen de ${titulo}`]
        );
      }
    }

    res.status(201).json({
      message: 'Incidente reportado por invitado con éxito',
      incidente: rows[0]
    });

  } catch (err) {
    console.error('Error al reportar incidente invitado:', err);
    res.status(500).json({ error: 'Error al reportar incidente como invitado' });
  }
});


// Ruta: Obtener un incidente por ID
app.get('/incidentes/:id', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*, 
        u.nombre AS usuario_nombre,
        u.email AS usuario_email,
        COUNT(img.id) AS imagenes_count
      FROM incidentes i
      LEFT JOIN usuarios u ON i.solicitante_id = u.id
      LEFT JOIN imagenes_incidente img ON i.id = img.incidente_id
      WHERE i.id = $1
      GROUP BY i.id, u.nombre, u.email`;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const incidente = result.rows[0];

    res.json({
      id: incidente.id,
      titulo: incidente.titulo,
      descripcion: incidente.descripcion,
      tipo: incidente.tipo,
      ubicacion_id: incidente.ubicacion_id,
      fecha_creacion: incidente.fecha_creacion,
      fecha_asignacion: incidente.fecha_asignacion,
      fecha_cierre: incidente.fecha_cierre,
      gravedad: incidente.gravedad,
      estado: incidente.estado,
      acciones_tomadas: incidente.acciones_tomadas,
      usuario: {
        nombre: incidente.usuario_nombre,
        email: incidente.usuario_email
      },
      imagenes_count: parseInt(incidente.imagenes_count, 10)
    });

  } catch (err) {
    console.error('Error al obtener incidente:', err.message);
    res.status(500).json({ error: 'Error al obtener el incidente' });
  }
});

// Ruta: Obtener las imagenes de un incidente
app.get('/incidentes/:id/imagenes', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, url, descripcion FROM imagenes_incidente WHERE incidente_id = $1',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener imágenes:', err.message);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

app.put('/incidentes/:id/estado', checkRole([1, 2]), async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: 'El estado es requerido' });
  }

  try {
    const query = `
      UPDATE incidentes 
      SET estado = $1,
          fecha_cierre = CASE WHEN $1 = 'resuelto' THEN NOW() ELSE fecha_cierre END
      WHERE id = $2
      RETURNING *`;

    const { rows } = await pool.query(query, [estado, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    res.json({ message: 'Estado actualizado', incidente: rows[0] });
  } catch (err) {
    console.error('Error actualizando estado:', err);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
});

//=====================
// Reporte
//=====================
// Crear un reporte (rol solicitante, crea el reporte, fecha_creacion automática)
app.post('/reporte', upload.array('imagenes', 5), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;
    const solicitante_id = req.headers['user-id'] ? parseInt(req.headers['user-id'], 10) : null;
    const fechaCreacion = new Date().toISOString();

    // Validar campos obligatorios
    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos marcados con * son requeridos' });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: 'ID de ubicación inválido' });
    }

    const insertQuery = `
      INSERT INTO incidente
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const valores = [titulo, descripcion, tipo, ubicacionIdNum, fechaCreacion, 'pendiente', solicitante_id, gravedad];

    const result = await pool.query(insertQuery, valores);
    const reporteId = result.rows[0].id;

    // Guardar imágenes asociadas
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          'INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)',
          [reporteId, url, `Imagen de ${titulo}`]
        );
      }
    }

    res.status(201).json({
      message: 'Reporte creado con éxito',
      reporte: result.rows[0]
    });
  } catch (err) {
    console.error('Error al crear reporte:', err);
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

app.post('/reporte/invitado', upload.array('imagenes', 3), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;

    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos marcados con * son requeridos' });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: 'ID de ubicación inválido' });
    }

    const fechaCreacion = new Date().toISOString();

    const insertQuery = `
      INSERT INTO incidente
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const valores = [titulo, descripcion, tipo, ubicacionIdNum, fechaCreacion, 'pendiente', 1, gravedad];

    const result = await pool.query(insertQuery, valores);
    const incidenteId = result.rows[0].id;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          'INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)',
          [incidenteId, url, `Imagen de ${titulo}`]
        );
      }
    }

    res.status(201).json({
      message: 'Incidente reportado por invitado con solicitante_id = 1 con éxito',
      incidente: result.rows[0]
    });

  } catch (err) {
    console.error('Error al reportar incidente invitado:', err);

    // Enviar mensaje de error detallado si existe
    const message = err.message || 'Error al reportar incidente como invitado';
    res.status(500).json({ error: message });
  }
});

// Obtener reporte por ID (con info usuario e imágenes)
app.get('/reporte/:id', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        r.*, 
        u.nombre AS usuario_nombre,
        u.email AS usuario_email,
        COUNT(img.id) AS imagenes_count
      FROM incidente r
      LEFT JOIN usuarios u ON r.solicitante_id = u.id
      LEFT JOIN imagenes_incidente img ON r.id = img.incidente_id
      WHERE r.id = $1
      GROUP BY r.id, u.nombre, u.email`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const reporte = result.rows[0];
    res.json({
      id: reporte.id,
      titulo: reporte.titulo,
      descripcion: reporte.descripcion,
      tipo: reporte.tipo,
      ubicacion_id: reporte.ubicacion_id,
      fecha_creacion: reporte.fecha_creacion,
      fecha_asignacion: reporte.fecha_asignacion,
      fecha_cierre: reporte.fecha_cierre,
      gravedad: reporte.gravedad,
      estado: reporte.estado,
      acciones_tomadas: reporte.acciones_tomadas,
      usuario: {
        nombre: reporte.usuario_nombre,
        email: reporte.usuario_email
      },
      imagenes_count: parseInt(reporte.imagenes_count, 10)
    });
  } catch (err) {
    console.error('Error al obtener reporte:', err.message);
    res.status(500).json({ error: 'Error al obtener el reporte' });
  }
});

// Obtener imágenes asociadas a un reporte
app.get('/reporte/:id/imagenes', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, url, descripcion FROM imagenes_incidente WHERE incidente_id = $1',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener imágenes:', err.message);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

// Actualizar campos asignación, cierre, acciones, operario, supervisor (solo roles autorizados)
app.put('/reporte/:id/actualizar', checkRole([2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_asignacion, fecha_cierre, acciones_tomadas, operario_id, supervisor_id, estado } = req.body;

    // Solo actualizar los campos permitidos, ignorar solicitante_id y fecha_creacion
    const updates = [];
    const values = [];
    let idx = 1;

    if (fecha_asignacion) {
      updates.push(`fecha_asignacion = $${idx++}`);
      values.push(fecha_asignacion);
    }
    if (fecha_cierre) {
      updates.push(`fecha_cierre = $${idx++}`);
      values.push(fecha_cierre);
    }
    if (acciones_tomadas) {
      updates.push(`acciones_tomadas = $${idx++}`);
      values.push(acciones_tomadas);
    }
    if (operario_id) {
      updates.push(`operario_id = $${idx++}`);
      values.push(operario_id);
    }
    if (supervisor_id) {
      updates.push(`supervisor_id = $${idx++}`);
      values.push(supervisor_id);
    }
    if (estado) {
      updates.push(`estado = $${idx++}`);
      values.push(estado);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    values.push(id);

    const query = `UPDATE reporte SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json({ message: 'Reporte actualizado', reporte: rows[0] });
  } catch (err) {
    console.error('Error al actualizar reporte:', err);
    res.status(500).json({ error: 'Error al actualizar reporte' });
  }
});


app.get('/reportes', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const query = `
      SELECT r.*, u.nombre AS usuario_nombre, u.email AS usuario_email,
        COUNT(img.id) AS imagenes_count
      FROM incidente r
      LEFT JOIN usuarios u ON r.solicitante_id = u.id
      LEFT JOIN imagenes_incidente img ON r.id = img.incidente_id
      GROUP BY r.id, u.nombre, u.email
      ORDER BY r.fecha_creacion DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    // Consulta para contar total de registros
    const countResult = await pool.query('SELECT COUNT(*) FROM incidente');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo reportes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Asignar responsable a incidente
app.post('/asignaciones', checkRole([1, 2]), async (req, res) => {
  try {
    const { incidente_id, responsable_id, comentarios } = req.body;

    // Verificar que el incidente existe y está pendiente
    const incidente = await pool.query(
      'SELECT estado FROM incidentes WHERE id = $1',
      [incidente_id]
    );

    if (incidente.rows.length === 0) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    // Verificar que el responsable existe
    const responsable = await pool.query(
      'SELECT id FROM responsables WHERE id = $1 AND activo = true',
      [responsable_id]
    );

    if (responsable.rows.length === 0) {
      return res.status(400).json({ error: 'Responsable no válido' });
    }

    // Crear asignación
    const { rows } = await pool.query(
      `INSERT INTO asignaciones 
       (incidente_id, responsable_id, comentarios)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [incidente_id, responsable_id, comentarios]
    );

    // Actualizar estado del incidente
    await pool.query(
      'UPDATE incidentes SET estado = $1 WHERE id = $2',
      ['asignado', incidente_id]
    );

    res.status(201).json({
      message: 'Incidente asignado con éxito',
      asignacion: rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al asignar incidente' });
  }
});

// Obtener responsables disponibles
// Obtener todos los usuarios con rol 3 (responsables)
app.get('/responsables', checkRole([1, 2]), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.id as responsable_id, 
        u.nombre, 
        u.email, 
        r.especialidad 
      FROM responsables r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE u.rol_id = 3 AND r.activo = true
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener responsables' });
  }
});


// Obtener asignaciones de un responsable
app.get('/mis-asignaciones', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const user_id = req.user.id;

    const { rows } = await pool.query(`
      SELECT 
        a.id as asignacion_id,
        i.*,
        a.estado_asignacion,
        a.fecha_asignacion,
        a.comentarios as comentarios_asignacion
      FROM asignaciones a
      JOIN incidentes i ON a.incidente_id = i.id
      JOIN responsables r ON a.responsable_id = r.id
      WHERE r.usuario_id = $1
      ORDER BY a.fecha_asignacion DESC
    `, [user_id]);

    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
});

// Actualizar estado de asignación
app.put('/asignaciones/:id', checkRole([1, 2, 3, 4]), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, comentarios } = req.body;
    const user_id = req.user.id;

    // Verificar que el usuario es el responsable
    const verificacion = await pool.query(`
      SELECT a.id 
      FROM asignaciones a
      JOIN responsables r ON a.responsable_id = r.id
      WHERE a.id = $1 AND r.usuario_id = $2
    `, [id, user_id]);

    if (verificacion.rows.length === 0 && req.user.rol_id !== 2) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { rows } = await pool.query(`
      UPDATE asignaciones 
      SET 
        estado_asignacion = $1,
        comentarios = COALESCE($2, comentarios)
      WHERE id = $3
      RETURNING *
    `, [estado, comentarios, id]);

    // Si se marca como completado, actualizar estado del incidente
    if (estado === 'completado') {
      await pool.query(
        'UPDATE incidentes SET estado = $1 WHERE id = $2',
        ['resuelto', rows[0].incidente_id]
      );
    }

    res.json({
      message: 'Asignación actualizada',
      asignacion: rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al actualizar asignación' });
  }
});


// Obtener métricas generales
app.get('/metricas', checkRole([1, 2]), async (req, res) => {
  try {
    // Estadísticas generales
    const generales = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
        COUNT(CASE WHEN estado = 'rechazado' THEN 1 END) as rechazados,
        COUNT(CASE WHEN usuario_id IS NULL THEN 1 END) as invitados
      FROM incidente
    `);

    // Resolución por tipo
    const porTipo = await pool.query(`
      SELECT 
        tipo,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
        ROUND(AVG(EXTRACT(EPOCH FROM (fecha_finalizacion - fecha_creacion)) / 3600)::numeric, 2)
      FROM incidente
      WHERE estado = 'resuelto'
      GROUP BY tipo
    `);

    // Eficiencia de responsables
    const responsables = await pool.query(`
      SELECT 
        u.nombre,
        COUNT(a.id) as tareas_asignadas,
        COUNT(CASE WHEN a.estado_asignacion = 'completado' THEN 1 END) as tareas_completadas,
        ROUND(AVG(EXTRACT(EPOCH FROM (fecha_finalizacion - fecha_creacion)) / 3600)::numeric, 2)
      FROM asignaciones a
      JOIN responsables r ON a.responsable_id = r.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN incidentes i ON a.incidente_id = i.id
      WHERE i.estado = 'resuelto'
      GROUP BY u.nombre
      ORDER BY tareas_completadas DESC
      LIMIT 5
    `);

    // Tendencia mensual
    const tendencia = await pool.query(`
      SELECT 
        DATE_TRUNC('month', fecha_creacion) as mes,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos
      FROM incidente
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6
    `);

    res.json({
      generales: generales.rows[0],
      porTipo: porTipo.rows,
      responsables: responsables.rows,
      tendencia: tendencia.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// 1. Obtener usuarios (paginado) - permitidos roles 1 y 2 (ejemplo)
app.get('/admin/usuarios', checkRole([1, 2]), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const query = {
      text: `
        SELECT id, nombre, email, rol_id, activo 
        FROM usuarios 
        WHERE (nombre ILIKE $1 OR email ILIKE $1)
        ORDER BY id
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    const countQuery = {
      text: `SELECT COUNT(*) FROM usuarios 
             WHERE (nombre ILIKE $1 OR email ILIKE $1)`,
      values: [`%${search}%`]
    };

    const [users, total] = await Promise.all([
      pool.query(query),
      pool.query(countQuery)
    ]);

    res.json({
      users: users.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (err) {
    console.error('Error en GET /admin/usuarios:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// 2. Crear usuario - roles 1 y 2 (ejemplo)
app.post('/admin/usuarios', checkRole([1, 2]), async (req, res) => {
  try {
    const { nombre, email, password, rol_id, activo = true } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol_id, activo`,
      [nombre, email, hashedPassword, rol_id, activo]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email ya registrado' });
    } else {
      console.error('Error en POST /admin/usuarios:', err.message);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
});

// 3. Actualizar usuario - roles 1 y 2 (ejemplo)
app.put('/admin/usuarios/:id', checkRole([1, 2]), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol_id, activo } = req.body;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, email = $2, rol_id = $3, activo = $4
       WHERE id = $5
       RETURNING id, nombre, email, rol_id, activo`,
      [nombre, email, rol_id, activo, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error en PUT /admin/usuarios:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// 4. Desactivar usuario (soft delete) - roles 1 y 2 (ejemplo)
app.delete('/admin/usuarios/:id', checkRole([1, 2]), async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE usuarios 
       SET activo = false 
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    console.error('Error en DELETE /admin/usuarios:', err.message);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

// 5. Obtener roles disponibles
app.get('/admin/roles', checkRole([1, 2]), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM roles ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /admin/roles:', err.message);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// Actualizar estado de solicitud de adquisición (solo rol admin, ej. rol_id 2)
app.put('/solicitudes/:id/estado', checkRole([2]), async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  // Verificamos que req.user esté definido (asumiendo que middleware auth ya corre antes)
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'No autorizado, usuario no autenticado' });
  }

  const id_usuario_aprueba = req.user.id;

  if (!estado) {
    return res.status(400).json({ error: 'El campo "estado" es obligatorio' });
  }

  try {
    const result = await pool.query(`
      UPDATE SolicitudAdquisicion
      SET 
        estado_solicitud = $1,
        id_usuario_aprueba = $2,
        fecha_aprobacion = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [estado, id_usuario_aprueba, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({
      message: 'Estado de solicitud actualizado',
      solicitud: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado de solicitud:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =========================
// Start
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
