const pool = require("../db");
const { notificar } = require("../utils/notificar"); // 🔔 Helper de notificaciones

// =========================
// Crear incidente (usuario logueado)
// =========================
const crearIncidente = async (req, res) => {
  try {
    console.log("📩 Request body:", req.body);
    console.log("🖼️ Archivos recibidos:", req.files?.length || 0);

    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;
    const solicitante_id = req.headers["user-id"]
      ? parseInt(req.headers["user-id"], 10)
      : null;
    const fechaActual = new Date().toISOString();

    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res
        .status(400)
        .json({ error: "Todos los campos marcados con * son requeridos" });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: "ID de ubicación inválido" });
    }

    const insertQuery = `
      INSERT INTO incidente
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;

    const { rows } = await pool.query(insertQuery, [
      titulo,
      descripcion,
      tipo,
      ubicacionIdNum,
      fechaActual,
      "pendiente",
      solicitante_id,
      gravedad,
    ]);

    const incidente = rows[0];

    // Guardar imágenes si existen
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          "INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)",
          [incidente.id, url, `Imagen de ${titulo}`]
        );
      }
    }

    // 🔔 Notificación al solicitante (si existe)
    if (solicitante_id) {
      await notificar({
        usuario_id: solicitante_id,
        titulo: "Incidente creado",
        mensaje: `Tu incidente "${titulo}" fue reportado exitosamente`,
        tipo: "éxito",
        link: `/incidentes/${incidente.id}`,
      });
    }

    // 🔔 Notificación a todos los administrativos (rol_id = 2)
    const admins = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);
    for (const admin of admins.rows) {
      await notificar({
        usuario_id: admin.id,
        titulo: "Nuevo incidente",
        mensaje: `Se reportó un nuevo incidente: "${titulo}"`,
        tipo: "alerta",
        link: `/incidentes/${incidente.id}`,
      });
    }

    res
      .status(201)
      .json({ message: "Incidente reportado con éxito", incidente });
  } catch (err) {
    console.error("❌ Error al reportar incidente:", err);
    res.status(500).json({ error: "Error al reportar incidente" });
  }
};

// =========================
// Crear incidente como invitado
// =========================
const crearIncidenteInvitado = async (req, res) => {
  try {
    if (req.headers["user-id"]) {
      return res
        .status(403)
        .json({ error: "Esta ruta es solo para invitados" });
    }

    const { titulo, descripcion, tipo, ubicacion_id, gravedad } = req.body;
    if (!titulo || !descripcion || !tipo || !ubicacion_id || !gravedad) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const ubicacionIdNum = parseInt(ubicacion_id, 10);
    if (isNaN(ubicacionIdNum)) {
      return res.status(400).json({ error: "ID de ubicación inválido" });
    }

    const fechaActual = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO incidente 
        (titulo, descripcion, tipo, ubicacion_id, fecha_creacion, estado, solicitante_id, gravedad)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
       RETURNING *`,
      [titulo, descripcion, tipo, ubicacionIdNum, fechaActual, "pendiente", gravedad]
    );

    const incidente = rows[0];

    // Guardar imágenes si existen
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = file.filename || file.path;
        await pool.query(
          "INSERT INTO imagenes_incidente (incidente_id, url, descripcion) VALUES ($1, $2, $3)",
          [incidente.id, url, `Imagen de ${titulo}`]
        );
      }
    }

    // 🔔 Notificación a administrativos (rol_id = 2)
    const admins = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);
    for (const admin of admins.rows) {
      await notificar({
        usuario_id: admin.id,
        titulo: "Nuevo incidente de invitado",
        mensaje: `Se reportó un incidente: "${titulo}"`,
        tipo: "alerta",
        link: `/incidentes/${incidente.id}`,
      });
    }

    res.status(201).json({
      message: "Incidente reportado por invitado con éxito",
      incidente,
    });
  } catch (err) {
    console.error("❌ Error al reportar incidente invitado:", err);
    res.status(500).json({ error: "Error al reportar incidente como invitado" });
  }
};

// =========================
// Obtener incidente por ID
// =========================
const obtenerIncidenteById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*, 
        u.nombre AS usuario_nombre,
        u.email AS usuario_email,
        COUNT(img.id) AS imagenes_count
      FROM incidente i
      LEFT JOIN usuarios u ON i.solicitante_id = u.id
      LEFT JOIN imagenes_incidente img ON i.id = img.incidente_id
      WHERE i.id = $1
      GROUP BY i.id, u.nombre, u.email`;

    const result = await pool.query(query, [Number(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Incidente no encontrado" });
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
        email: incidente.usuario_email,
      },
      imagenes_count: parseInt(incidente.imagenes_count, 10),
    });
  } catch (err) {
    console.error("❌ Error al obtener incidente:", err.message);
    res.status(500).json({ error: "Error al obtener el incidente" });
  }
};

// =========================
// Obtener imágenes de incidente
// =========================
const obtenerImagenesIncidente = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT id, url, descripcion FROM imagenes_incidente WHERE incidente_id = $1",
      [Number(id)]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener imágenes:", err.message);
    res.status(500).json({ error: "Error al obtener imágenes" });
  }
};

// =====================
// Detalles del incidente (desde asignación)
// =====================
const obtenerDetalleIncidente = async (req, res) => {
  try {
    const { id: asignacionId } = req.params;

    if (!asignacionId || isNaN(asignacionId)) {
      return res.status(400).json({ error: "ID de asignación no válido" });
    }

    const query = `
      SELECT i.*
      FROM incidente i
      INNER JOIN asignaciones a ON i.id = a.incidente_id
      WHERE a.id = $1
    `;

    const { rows } = await pool.query(query, [Number(asignacionId)]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Detalle del incidente no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error en obtenerDetalleIncidente:", err);
    res.status(500).json({
      error: "Error al obtener detalles del incidente",
      message: err.message,
    });
  }
};

// =========================
// Cambiar estado de incidente
// =========================
const actualizarEstadoIncidente = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ error: "El estado es requerido" });
  }

  try {
    const query = `
      UPDATE incidente
      SET estado = $1,
          fecha_cierre = CASE WHEN $1 = 'resuelto' THEN NOW() ELSE fecha_cierre END
      WHERE id = $2
      RETURNING *`;

    const { rows } = await pool.query(query, [estado, Number(id)]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    const incidente = rows[0];

    // 🔔 Notificar al solicitante si existe
    if (incidente.solicitante_id) {
      await notificar({
        usuario_id: incidente.solicitante_id,
        titulo: "Estado actualizado",
        mensaje: `Tu incidente "${incidente.titulo}" cambió a estado: ${estado}`,
        tipo: "info",
        link: `/incidentes/${incidente.id}`,
      });
    }

    res.json({ message: "Estado actualizado", incidente });
  } catch (err) {
    console.error("❌ Error actualizando estado:", err);
    res.status(500).json({ error: "Error al actualizar el estado" });
  }
};

module.exports = {
  crearIncidente,
  crearIncidenteInvitado,
  obtenerDetalleIncidente,
  obtenerIncidenteById,
  obtenerImagenesIncidente,
  actualizarEstadoIncidente,
};
