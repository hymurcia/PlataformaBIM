const pool = require('../db');
const upload = require('../middleware/uploads'); // si usas multer
const checkRole = require('../middleware/roles');

const crearReporte = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;
    const solicitante_id = req.user.id;
    const fechaCreacion = new Date().toISOString();

    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos marcados con * son requeridos' });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) return res.status(400).json({ error: 'ID de ubicación inválido' });

    const insertQuery = `
      INSERT INTO incidente
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;
    const valores = [titulo, descripcion, tipo, ubicacionIdNum, fechaCreacion, 'pendiente', solicitante_id, gravedad];

    const result = await pool.query(insertQuery, valores);
    const reporteId = result.rows[0].id;

    // Guardar imágenes si existen
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          'INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)',
          [reporteId, url, `Imagen de ${titulo}`]
        );
      }
    }

    res.status(201).json({ message: 'Reporte creado con éxito', reporte: result.rows[0] });

  } catch (err) {
    console.error('Error al crear reporte:', err);
    res.status(500).json({ error: 'Error al crear reporte' });
  }
};

module.exports = { crearReporte };


// Crear reporte como invitado
const crearReporteInvitado = async (req, res) => {
  try {
    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;

    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: 'Todos los campos marcados con * son requeridos' });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) return res.status(400).json({ error: 'ID de ubicación inválido' });

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
      message: 'Incidente reportado por invitado (solicitante_id = 1)',
      incidente: result.rows[0]
    });
  } catch (err) {
    console.error('Error al reportar incidente invitado:', err);
    res.status(500).json({ error: err.message || 'Error al reportar incidente' });
  }
};

// Obtener reporte por ID
const obtenerReporte = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID de reporte inválido' });

    const query = `
      SELECT r.*, 
             u.nombre AS usuario_nombre, 
             u.email AS usuario_email,
             COALESCE(COUNT(img.id), 0) AS imagenes_count,
             loc.nombre AS ubicacion_nombre
      FROM incidente r
      LEFT JOIN usuarios u ON r.solicitante_id = u.id
      LEFT JOIN imagenes_incidente img ON r.id = img.incidente_id
      LEFT JOIN ubicaciones loc ON r.ubicacion_id = loc.id
      WHERE r.id = $1
      GROUP BY r.id, u.nombre, u.email, loc.nombre
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Reporte no encontrado' });

    const reporte = result.rows[0];
    res.json({ ...reporte, imagenes_count: parseInt(reporte.imagenes_count, 10) });
  } catch (err) {
    console.error('Error al obtener reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

// Obtener imágenes de un reporte
const obtenerImagenesReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, url, descripcion FROM imagenes_incidente WHERE incidente_id = $1',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener imágenes:', err);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
};

// Actualizar un reporte
const actualizarReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_asignacion, fecha_cierre, acciones_tomadas, operario_id, supervisor_id, estado } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (fecha_asignacion) { updates.push(`fecha_asignacion = $${idx++}`); values.push(fecha_asignacion); }
    if (fecha_cierre) { updates.push(`fecha_cierre = $${idx++}`); values.push(fecha_cierre); }
    if (acciones_tomadas) { updates.push(`acciones_tomadas = $${idx++}`); values.push(acciones_tomadas); }
    if (operario_id) { updates.push(`operario_id = $${idx++}`); values.push(operario_id); }
    if (supervisor_id) { updates.push(`supervisor_id = $${idx++}`); values.push(supervisor_id); }
    if (estado) { updates.push(`estado = $${idx++}`); values.push(estado); }

    if (updates.length === 0) return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });

    values.push(id);
    const query = `UPDATE incidente SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) return res.status(404).json({ error: 'Reporte no encontrado' });

    res.json({ message: 'Reporte actualizado', reporte: rows[0] });
  } catch (err) {
    console.error('Error al actualizar reporte:', err);
    res.status(500).json({ error: 'Error al actualizar reporte' });
  }
};

// Listar reportes con paginación y filtros
const listarReportes = async (req, res) => {
  try {
    let { page = 1, limit = 10, estado } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Parámetros dinámicos
    const params = [];
    let whereConditions = [];
    
    // 🔹 Si rol_id = 4, solo reportes creados por el usuario
    if (req.user?.rol_id === 4) {
      params.push(req.user.id);
      whereConditions.push(`r.solicitante_id = $${params.length}`);
    }

    // 🔹 Filtro por estado si se envía
    if (estado) {
      params.push(estado);
      whereConditions.push(`r.estado = $${params.length}`);
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 🔹 Query principal con joins
    const query = `
      SELECT r.*,
             u1.nombre AS solicitante_nombre, u1.email AS solicitante_email,
             u2.nombre AS operario_nombre, u2.email AS operario_email,
             u3.nombre AS supervisor_nombre, u3.email AS supervisor_email,
             ub.nombre AS ubicacion_nombre,
             COUNT(img.id) AS imagenes_count
      FROM incidente r
      LEFT JOIN usuarios u1 ON r.solicitante_id = u1.id
      LEFT JOIN usuarios u2 ON r.operario_id = u2.id
      LEFT JOIN usuarios u3 ON r.supervisor_asignador_id = u3.id
      LEFT JOIN ubicaciones ub ON r.ubicacion_id = ub.id
      LEFT JOIN imagenes_incidente img ON r.id = img.incidente_id
      ${whereClause}
      GROUP BY r.id, u1.nombre, u1.email, u2.nombre, u2.email, u3.nombre, u3.email, ub.nombre
      ORDER BY r.fecha_creacion DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    // 🔹 Query para contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM incidente r
      ${whereClause};
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      incidentes: result.rows
    });

  } catch (err) {
    console.error('Error obteniendo reportes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  crearReporte,
  crearReporteInvitado,
  obtenerReporte,
  obtenerImagenesReporte,
  actualizarReporte,
  listarReportes
};
