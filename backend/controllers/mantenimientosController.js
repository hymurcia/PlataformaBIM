const pool = require('../db'); // conexión a PostgreSQL (pg.Pool)

// ==========================
// Obtener todos los mantenimientos con el nombre del responsable
// ==========================
const getMantenimientos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.nombre,
        m.descripcion,
        m.fecha_programada,
        m.estado,
        m.frecuencia,
        m.dias,
        c.nombre AS componente, 
        m.comentarios,
        m.fecha_ultima_ejecucion,
        m.operario_id,
        COALESCE(u.nombre, 'No asignado') AS responsable_nombre,
        COALESCE(u.apellido, 'No asignado') AS responsable_apellido,
        COALESCE(r.especialidad, 'No asignada') AS especialidad
      FROM mantenimientos m
      LEFT JOIN usuarios u ON u.id = m.operario_id
      LEFT JOIN responsables r ON r.usuario_id = m.operario_id
      LEFT JOIN componentes c ON c.id = m.componente_id 
      ORDER BY m.id;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener mantenimientos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


// ==========================
// Obtener mis mantenimientos (según usuario logueado)
// ==========================
const getMisMantenimientos = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Buscar el responsable asociado al usuario
    const resp = await pool.query(
      "SELECT id FROM responsables WHERE usuario_id = $1",
      [usuarioId]
    );

    if (resp.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró responsable asignado a este usuario" });
    }

    const responsableId = resp.rows[0].id;

    // Consultar los mantenimientos asignados a ese responsable
    const result = await pool.query(`
      SELECT 
        m.*,
        r.id AS responsable_id,
        u.id AS usuario_id,
        u.nombre || ' ' || u.apellido AS responsable_nombre,
        r.especialidad
      FROM mantenimientos m
      LEFT JOIN responsables r ON m.operario_id = r.id
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      WHERE m.operario_id = $1
      ORDER BY m.fecha_programada ASC
    `, [responsableId]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mis mantenimientos:", error);
    res.status(500).json({
      error: "Error interno al obtener mis mantenimientos",
      detalle: error.message
    });
  }
};

// ==========================
// Obtener un mantenimiento por ID
// ==========================
const getMantenimientoById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        r.id AS responsable_id,
        u.id AS usuario_id,
        u.nombre || ' ' || u.apellido AS responsable_nombre,
        r.especialidad
      FROM mantenimientos m
      LEFT JOIN responsables r ON m.operario_id = r.id
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener mantenimiento:', error);
    res.status(500).json({ error: 'Error al obtener mantenimiento' });
  }
};

// ==========================
// Crear un mantenimiento
// ==========================
const createMantenimiento = async (req, res) => {
  const { nombre, descripcion, frecuencia, fecha_ultima_ejecucion, operario_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO mantenimientos 
        (nombre, descripcion, frecuencia, fecha_ultima_ejecucion, operario_id) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, frecuencia, fecha_ultima_ejecucion || null, operario_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear mantenimiento:', error.message);
    res.status(500).json({ error: 'Error al crear mantenimiento' });
  }
};

// ==========================
// Actualizar un mantenimiento
// ==========================
const updateMantenimiento = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, frecuencia, fecha_ultima_ejecucion, operario_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE mantenimientos 
       SET nombre = $1,
           descripcion = $2,
           frecuencia = $3,
           fecha_ultima_ejecucion = $4,
           operario_id = $5
       WHERE id = $6
       RETURNING *`,
      [nombre, descripcion, frecuencia, fecha_ultima_ejecucion || null, operario_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar mantenimiento:', error.message);
    res.status(500).json({ error: 'Error al actualizar mantenimiento' });
  }
};

// ==========================
// Actualizar un mantenimiento
// ==========================
const updateMantenimientoEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, comentarios } = req.body;

  try {
    // 🔹 Obtener el mantenimiento actual
    const mantenimientoResult = await pool.query(
      `SELECT * FROM mantenimientos WHERE id = $1`,
      [id]
    );

    if (mantenimientoResult.rows.length === 0) {
      return res.status(404).json({ message: "Mantenimiento no encontrado" });
    }

    const mantenimiento = mantenimientoResult.rows[0];

    let fechaUltimaEjecucion = mantenimiento.fecha_ultima_ejecucion;
    let fechaProgramada = mantenimiento.fecha_programada;

    if (estado.toLowerCase() === "completado") {
      // 🔹 Guardar la fecha actual como última ejecución
      const ahora = new Date();
      fechaUltimaEjecucion = ahora;
      fechaProgramada = new Date(ahora);

      // 🔹 Calcular la próxima fecha según frecuencia
      switch (mantenimiento.frecuencia?.toLowerCase()) {
        case "diario":
          fechaProgramada.setDate(fechaProgramada.getDate() + 1);
          break;
        case "semanal":
          fechaProgramada.setDate(fechaProgramada.getDate() + 7);
          break;
        case "mensual":
          fechaProgramada.setMonth(fechaProgramada.getMonth() + 1);
          break;
        case "trimestral":
          fechaProgramada.setMonth(fechaProgramada.getMonth() + 3);
          break;
        case "anual":
          fechaProgramada.setFullYear(fechaProgramada.getFullYear() + 1);
          break;
        default:
          fechaProgramada = ahora;
      }

      // 🔹 UPDATE con parámetros
      const result = await pool.query(
        `UPDATE mantenimientos
         SET estado = $1,
             comentarios = $2,
             fecha_ultima_ejecucion = $3,
             fecha_programada = $4
         WHERE id = $5
         RETURNING *;`,
        [estado, comentarios, fechaUltimaEjecucion, fechaProgramada, id]
      );

      return res.json(result.rows[0]);
    } else {
      // 🔹 Si no es "completado", solo actualiza estado y comentarios
      const result = await pool.query(
        `UPDATE mantenimientos
         SET estado = $1,
             comentarios = $2
         WHERE id = $3
         RETURNING *;`,
        [estado, comentarios, id]
      );

      return res.json(result.rows[0]);
    }
  } catch (error) {
    console.error("❌ Error al actualizar estado de mantenimiento:", error.message);
    res.status(500).json({ error: "Error al actualizar estado de mantenimiento" });
  }
};


// ==========================
// Eliminar un mantenimiento
// ==========================
const deleteMantenimiento = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM mantenimientos WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }
    res.json({ message: 'Mantenimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar mantenimiento:', error.message);
    res.status(500).json({ error: 'Error al eliminar mantenimiento' });
  }
};

module.exports = {
  getMantenimientos,
  getMantenimientoById,
  getMisMantenimientos,
  createMantenimiento,
  updateMantenimiento,
  updateMantenimientoEstado,
  deleteMantenimiento
};
