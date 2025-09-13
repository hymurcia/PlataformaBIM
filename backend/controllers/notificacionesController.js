// controllers/notificacionesController.js
const pool = require("../db"); // conexión a PostgreSQL
let io; // se inyecta desde app.js

// 🔹 Inicializar Socket.IO en el controlador
const setSocket = (socketIO) => {
  io = socketIO;
};

// 🔹 Crear una notificación
const crearNotificacion = async (req, res) => {
  try {
    const { usuario_id, titulo, mensaje, tipo, link } = req.body;

    if (!usuario_id || isNaN(parseInt(usuario_id))) {
      return res.status(400).json({ error: "❌ usuario_id inválido o no enviado" });
    }

    const result = await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link, fecha_creacion, leida)
       VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)
       RETURNING *`,
      [usuario_id, titulo, mensaje, tipo, link]
    );

    const notificacion = result.rows[0];

    // Emitir en tiempo real al usuario específico
    if (io) {
      io.to(`usuario_${usuario_id}`).emit("nueva_notificacion", notificacion);
    }

    res.status(201).json(notificacion);
  } catch (error) {
    console.error("Error creando notificación:", error);
    res.status(500).json({ error: "Error creando notificación" });
  }
};

// 🔹 Obtener notificaciones de un usuario
const obtenerNotificaciones = async (req, res) => {
  try {
    const { usuario_id } = req.params;

    if (!usuario_id || isNaN(parseInt(usuario_id))) {
      return res.status(400).json({ error: "❌ usuario_id inválido o no enviado" });
    }

    const result = await pool.query(
      `SELECT * FROM notificaciones 
       WHERE usuario_id = $1
       ORDER BY fecha_creacion DESC`,
      [usuario_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({ error: "Error obteniendo notificaciones" });
  }
};

// 🔹 Marcar notificación como leída
const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "❌ id inválido o no enviado" });
    }

    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = TRUE, fecha_lectura = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error marcando notificación como leída:", error);
    res.status(500).json({ error: "Error actualizando notificación" });
  }
};

module.exports = {
  setSocket,
  crearNotificacion,
  obtenerNotificaciones,
  marcarLeida,
};
