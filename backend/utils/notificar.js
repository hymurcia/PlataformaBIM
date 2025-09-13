const pool = require("../db");
let io; // socket.io se inyecta desde app.js

// Inicializar socket
const setSocket = (socketIO) => {
  io = socketIO;
};

/**
 * Crear y emitir una notificación en tiempo real
 * @param {Object} params - datos de la notificación
 * @param {number} params.usuario_id - ID del usuario destinatario
 * @param {string} params.titulo - Título de la notificación
 * @param {string} params.mensaje - Contenido de la notificación
 * @param {string} [params.tipo='info'] - Tipo de notificación (info, alerta, éxito, error)
 * @param {string} [params.link=null] - Enlace opcional relacionado
 */
const notificar = async ({ usuario_id, titulo, mensaje, tipo = "info", link = null }) => {
  try {
    // Guardar en la base de datos
    const result = await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [usuario_id, titulo, mensaje, tipo, link]
    );

    const notificacion = result.rows[0];

    // Emitir en tiempo real al usuario
    if (io) {
      io.to(`usuario_${usuario_id}`).emit("nueva_notificacion", notificacion);
    }

    return notificacion;
  } catch (error) {
    console.error("❌ Error creando notificación:", error);
  }
};

module.exports = {
  setSocket,
  notificar,
};
