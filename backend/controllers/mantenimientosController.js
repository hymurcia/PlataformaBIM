const pool = require('../db'); // conexión a PostgreSQL (pg.Pool)

// ==========================
// Obtener todos los mantenimientos con información completa
// ==========================
const obtenerMantenimientos = async (req, res) => {
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
        m.comentarios,
        m.fecha_ultima_ejecucion,
        m.operario_id,
        m.componente_id,
        m.ubicacion_id,
        c.nombre AS componente_nombre,
        ubi.nombre AS ubicacion_nombre,
        ubi.bloque AS ubicacion_bloque,
        ubi.piso AS ubicacion_piso,
        ubi.salon AS ubicacion_salon,
        COALESCE(u.nombre, 'No asignado') AS responsable_nombre,
        COALESCE(u.apellido, 'No asignado') AS responsable_apellido,
        COALESCE(r.especialidad, 'No asignada') AS especialidad
      FROM mantenimientos m
      LEFT JOIN usuarios u ON u.id = m.operario_id
      LEFT JOIN responsables r ON r.usuario_id = m.operario_id
      LEFT JOIN componentes c ON c.id = m.componente_id
      LEFT JOIN ubicaciones ubi ON ubi.id = m.ubicacion_id
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
const obtenerMisMantenimientos = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // buscar responsable asociado al usuario
    const respRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );

    const responsable = respRes.rows[0];
    if (!responsable) {
      return res.status(403).json({ error: 'No eres un responsable válido' });
    }

    // traer mantenimientos asignados a este responsable
    const { rows } = await pool.query(
      `SELECT m.id, m.descripcion, m.estado, m.fecha_programada
       FROM mantenimientos m
       INNER JOIN asignaciones a ON a.mantenimiento_id = m.id
       WHERE a.responsable_id = $1`,
      [responsable.id]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error en getMisMantenimientos:', err.message);
    res.status(500).json({ error: 'Error al obtener mantenimientos' });
  }
};


// ==========================
// Obtener un mantenimiento por ID
// ==========================
const obtenerMantenimientoById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        ubi.nombre AS ubicacion_nombre,
        ubi.bloque AS ubicacion_bloque,
        ubi.piso AS ubicacion_piso,
        ubi.salon AS ubicacion_salon,
        ubi.id AS ubicacion_id,
        c.nombre AS componente_nombre,
        c.id AS componente_id,
        op.nombre AS operario_nombre,
        op.apellido AS operario_apellido,
        op.id AS operario_id
      FROM mantenimientos m
      LEFT JOIN ubicaciones ubi ON ubi.id = m.ubicacion_id
      LEFT JOIN componentes c ON c.id = m.componente_id
      LEFT JOIN usuarios op ON op.id = m.operario_id
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
const crearMantenimiento = async (req, res) => {
  const { 
    nombre, 
    descripcion, 
    frecuencia, 
    fecha_programada, 
    operario_id, 
    componente_id, 
    ubicacion_id, 
    dias,
    comentarios 
  } = req.body;

  try {
    if (!componente_id && !ubicacion_id) {
      return res.status(400).json({ 
        error: 'Debe especificar un componente o una ubicación' 
      });
    }

    const result = await pool.query(
      `INSERT INTO mantenimientos 
        (nombre, descripcion, frecuencia, fecha_programada, 
         operario_id, componente_id, ubicacion_id, dias, comentarios) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        nombre, 
        descripcion, 
        frecuencia, 
        fecha_programada || null, 
        operario_id || null, 
        componente_id || null, 
        ubicacion_id || null,
        dias || null,
        comentarios || null
      ]
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
const actualizarMantenimiento = async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, 
    descripcion, 
    frecuencia, 
    fecha_programada, 
    operario_id, 
    componente_id, 
    ubicacion_id, 
    dias,
    comentarios 
  } = req.body;

  try {
    if (!componente_id && !ubicacion_id) {
      return res.status(400).json({ 
        error: 'Debe especificar un componente o una ubicación' 
      });
    }

    const result = await pool.query(
      `UPDATE mantenimientos 
       SET nombre = $1,
           descripcion = $2,
           frecuencia = $3,
           fecha_programada = $4,
           operario_id = $5,
           componente_id = $6,
           ubicacion_id = $7,
           dias = $8,
           comentarios = $9
       WHERE id = $10
       RETURNING *`,
      [
        nombre, 
        descripcion, 
        frecuencia, 
        fecha_programada || null, 
        operario_id || null, 
        componente_id || null, 
        ubicacion_id || null,
        dias || null,
        comentarios || null,
        id
      ]
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
// Actualizar estado de un mantenimiento
// ==========================
const actualizarMantenimientoEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, comentarios } = req.body;

  try {
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

    if (estado && estado.toLowerCase() === "completado") {
      const ahora = new Date();
      fechaUltimaEjecucion = ahora;

      if (mantenimiento.frecuencia) {
        fechaProgramada = new Date(ahora);
        switch (mantenimiento.frecuencia.toLowerCase()) {
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
            fechaProgramada = mantenimiento.fecha_programada;
        }
      }

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
const eliminarMantenimiento = async (req, res) => {
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
  obtenerMantenimientos,
  obtenerMantenimientoById,
  obtenerMisMantenimientos,
  crearMantenimiento,
  actualizarMantenimiento,
  actualizarMantenimientoEstado,
  eliminarMantenimiento
};
