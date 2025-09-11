const pool = require("../db");

// Crear nueva solicitud
const crearSolicitud = async (req, res) => {
  try {
    // El usuario lo obtenemos del token JWT (middleware de auth)
    const usuarioId = req.user.id; 
    const usuarioNombre = `${req.user.nombre} ${req.user.apellido}`;

    const { item_solicitado, cantidad } = req.body;

    if (!item_solicitado || !cantidad) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const result = await pool.query(
      `INSERT INTO solicitudadquisicion 
        (usuario_solicitante, item_solicitado, cantidad, estado_solicitud, id_usuario_aprueba) 
       VALUES ($1, $2, $3, 'pendiente', NULL) 
       RETURNING *`,
      [usuarioNombre, item_solicitado, cantidad]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear solicitud:", error);
    res.status(500).json({ error: "Error interno al crear solicitud" });
  }
};

// Obtener todas las solicitudes
const obtenerSolicitudes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM solicitudadquisicion ORDER BY fecha_solicitud DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    res.status(500).json({ error: "Error interno al obtener solicitudes" });
  }
};

module.exports = {
  crearSolicitud,
  obtenerSolicitudes,
};
