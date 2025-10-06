const pool = require("../db");
let io; // socket.io se inyecta desde app.js

// Inicializar socket
const setSocket = (socketIO) => {
  io = socketIO;
};

/**
 * Crear y emitir una notificación en tiempo real
 * ⚡ Con validación: solo se crea una vez al día por usuario/título/tipo
 * @param {Object} params - datos de la notificación
 * @param {number} params.usuario_id - ID del usuario destinatario
 * @param {string} params.titulo - Título de la notificación
 * @param {string} params.mensaje - Contenido de la notificación
 * @param {string} [params.tipo='info'] - Tipo de notificación (info, alerta, éxito, error)
 * @param {string} [params.link=null] - Enlace opcional relacionado
 */
const notificar = async ({ usuario_id, titulo, mensaje, tipo = "info", link = null }) => {
  try {
    // 1️⃣ Verificar si ya existe una notificación igual hoy
    const { rows: existentes } = await pool.query(
      `
      SELECT 1
      FROM notificaciones
      WHERE usuario_id = $1
        AND titulo = $2
        AND tipo = $3
        AND DATE(fecha_creacion) = CURRENT_DATE
      LIMIT 1
      `,
      [usuario_id, titulo, tipo]
    );

    if (existentes.length > 0) {
      console.log(`🔔 Notificación ya creada hoy para usuario ${usuario_id}, se omite.`);
      return null;
    }

    // 2️⃣ Guardar en la base de datos
    const result = await pool.query(
      `
      INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, fecha_creacion, link)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *
      `,
      [usuario_id, titulo, mensaje, tipo, link]
    );

    const notificacion = result.rows[0];

    // 3️⃣ Emitir en tiempo real al usuario
    if (io) {
      io.to(`usuario_${usuario_id}`).emit("nueva_notificacion", notificacion);
    }

    console.log(`✅ Notificación creada para usuario ${usuario_id}`);
    return notificacion;
  } catch (error) {
    console.error("❌ Error creando notificación:", error);
  }
};

module.exports = {
  setSocket,
  notificar,
};
