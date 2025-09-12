const pool = require('../db'); // tu conexión a PostgreSQL

// Función para generar recomendaciones con prioridad
const generarRecomendaciones = async () => {
  // Ejemplo: podrías leer datos reales de inventario, clima, revisiones
  const recomendaciones = [
    {
      area: "Desagües",
      recomendacion: "Revisar y limpiar para prevenir inundaciones",
      prioridad: "alta", // alta, media, baja
    },
    {
      area: "Sistemas eléctricos",
      recomendacion: "Verificar conexiones y tableros",
      prioridad: "media",
    },
    {
      area: "Extintores y seguridad",
      recomendacion: "Revisar carga y vencimiento",
      prioridad: "alta",
    },
    {
      area: "Techos y canaletas",
      recomendacion: "Limpiar hojas y obstrucciones",
      prioridad: "media",
    },
  ];

  // Aquí puedes agregar lógica dinámica, por ejemplo:
  // Si el inventario de desagües está bajo o pronóstico de lluvia alto → prioridad alta
  return recomendaciones;
};

const obtenerNotificaciones = async (req, res) => {
  try {
    // 1️⃣ Notificaciones del sistema
    const resultNotificaciones = await pool.query(`
      SELECT id, mensaje, fecha_creacion AS fecha
      FROM sistema_notificaciones
      WHERE activo = true
      ORDER BY fecha_creacion DESC
      LIMIT 10
    `);

    const notificaciones = resultNotificaciones.rows;

    // 2️⃣ Recomendaciones preventivas avanzadas
    const recomendaciones = await generarRecomendaciones();

    res.json({
      notificaciones,
      recomendaciones,
    });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
};

module.exports = { obtenerNotificaciones };
