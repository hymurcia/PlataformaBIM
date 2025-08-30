// controllers/solicitudController.js
const pool = require("../db");

// Obtener todas las solicitudes
const getSolicitudes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM solicitudadquisicion ORDER BY fecha_solicitud DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener solicitudes" });
  }
};

// Obtener una solicitud por ID
const getSolicitudById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM solicitudadquisicion WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener la solicitud" });
  }
};

// Crear una solicitud
const createSolicitud = async (req, res) => {
  try {
    const { usuario_solicitante, item_solicitado, cantidad } = req.body;
    const result = await pool.query(
      `INSERT INTO solicitudadquisicion (usuario_solicitante, item_solicitado, cantidad) 
       VALUES ($1, $2, $3) RETURNING *`,
      [usuario_solicitante, item_solicitado, cantidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la solicitud" });
  }
};

// Actualizar estado de la solicitud (aprobar/rechazar)
const updateSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_solicitud, id_usuario_aprueba } = req.body;

    const result = await pool.query(
      `UPDATE solicitudadquisicion 
       SET estado_solicitud = $1, id_usuario_aprueba = $2, fecha_aprobacion = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [estado_solicitud, id_usuario_aprueba, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la solicitud" });
  }
};

// Eliminar solicitud
const deleteSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM solicitudadquisicion WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    res.json({ message: "Solicitud eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la solicitud" });
  }
};

module.exports = {
  getSolicitudes,
  getSolicitudById,
  createSolicitud,
  updateSolicitud,
  deleteSolicitud,
};
