const pool = require('../db'); // conexión a la BD

// =====================
// Asignar responsable a incidente
// =====================
const asignarResponsable = async (req, res) => {
  try {
    const { incidente_id, responsable_id, comentarios, fecha_finalizacion } = req.body;
    const supervisorId = req.user.id; // supervisor logueado desde JWT

    // 1. Verificar que el incidente existe
    const incidente = await pool.query(
      'SELECT id, estado FROM incidente WHERE id = $1',
      [incidente_id]
    );

    if (incidente.rows.length === 0) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    if (incidente.rows[0].estado === 'resuelto') {
      return res.status(400).json({ error: 'El incidente ya está resuelto' });
    }

    // 2. Verificar que el responsable existe y está activo (usando usuario_id)
    const responsable = await pool.query(
      `SELECT r.id AS responsable_id, r.usuario_id, r.especialidad, u.nombre, u.email
       FROM responsables r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id = $1 AND r.activo = true`,
      [responsable_id] // 👈 aquí recibimos usuario_id
    );

    if (responsable.rows.length === 0) {
      return res.status(400).json({ error: 'Responsable no válido o inactivo' });
    }

    // 👇 Usamos el id real de la tabla responsables
    const responsableRealId = responsable.rows[0].responsable_id;



    // 3. Crear asignación
    const { rows } = await pool.query(
      `INSERT INTO asignaciones 
    (incidente_id, responsable_id, comentarios, estado_asignacion, fecha_asignacion)
   VALUES ($1, $2, $3, 'pendiente', NOW())
   RETURNING *`,
      [incidente_id, responsableRealId, comentarios || null]
    );

    // 4. Actualizar incidente → supervisor + estado + fecha_asignacion
    await pool.query(
      `UPDATE incidente 
       SET estado = $1,
           supervisor_asignador_id = $2,
           fecha_asignacion = NOW()
       WHERE id = $3`,
      ['asignado', supervisorId, incidente_id]
    );

    res.status(201).json({
      message: 'Incidente asignado con éxito',
      asignacion: rows[0],
      responsable: responsable.rows[0]
    });
  } catch (err) {
    console.error('Error en asignarResponsable:', err.message);
    res.status(500).json({ error: 'Error al asignar incidente' });
  }
};


// =====================
// Obtener responsables disponibles
// =====================
const obtenerResponsables = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.usuario_id AS id,      -- 👈 ahora devolvemos como id
        u.nombre, 
        u.apellido,
        u.email, 
        u.telefono,
        r.especialidad 
      FROM responsables r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE u.rol_id = 3 
        AND r.activo = true
      ORDER BY u.nombre ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error en getResponsables:', err.message);
    res.status(500).json({ error: 'Error al obtener responsables' });
  }
};

// =====================
// Obtener tareas de un responsable (incidentes + mantenimientos)
// =====================
const obtenerMisAsignaciones = async (req, res) => {
  try {
    const usuarioId = req.user.id; // usuario_id del JWT

    // 🔹 Buscar el id del responsable vinculado a este usuario
    const responsableRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );

    const responsable = responsableRes.rows[0];

    // Si no es responsable activo, no tiene asignaciones
    if (!responsable) {
      return res.json([]);
    }

    // --- 1. Incidentes asignados ---
    const incidentes = await pool.query(
      `
      SELECT 
        a.id AS tarea_id,
        'incidente' AS tipo_tarea,
        i.titulo,
        i.descripcion,
        i.estado,
        a.estado_asignacion,
        a.fecha_asignacion,
        a.comentarios AS comentarios_asignacion
      FROM asignaciones a
      JOIN incidente i ON a.incidente_id = i.id
      WHERE a.responsable_id = $1
      AND a.estado_asignacion != 'resuelto'
      ORDER BY a.fecha_asignacion DESC
      `,
      [responsable.id] // usamos id del responsable
    );

    // 🔹 Retornar solo incidentes
    res.json(incidentes.rows);
  } catch (err) {
    console.error('Error en getMisAsignaciones:', err.message);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
};


// =====================
// Actualizar estado de asignación
// =====================
const actualizarAsignacion = async (req, res) => {
  try {
    const asignacionId = req.params.id;
    const { estado, comentarios, tipo } = req.body;
    const usuarioId = req.user.id; // del JWT

    // 1. Buscar id del responsable vinculado al usuario
    const respRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );
    const responsable = respRes.rows[0];

    if (!responsable) {
      return res.status(403).json({ error: 'No eres un responsable válido' });
    }

    // 2. Validar que la asignación pertenece a este responsable
    const asignacionRes = await pool.query(
      `SELECT * FROM asignaciones WHERE id = $1 AND responsable_id = $2`,
      [asignacionId, responsable.id]
    );

    if (asignacionRes.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar esta asignación' });
    }

    // 3. Actualizar la asignación
    const { rows } = await pool.query(
      `UPDATE asignaciones
       SET estado_asignacion = $1,
           comentarios = $2
       WHERE id = $3
       RETURNING *`,
      [estado, comentarios || null, asignacionId]
    );

    // 4. Si se completó, actualizar también el incidente
    if (tipo === 'incidente' && estado === 'completado') {
      await pool.query(
        `UPDATE incidente
         SET estado = 'resuelto',
             fecha_cierre = NOW()
         WHERE id = $1`,
        [asignacionRes.rows[0].incidente_id]
      );
    }

    res.json({ message: 'Tarea actualizada con éxito', asignacion: rows[0] });
  } catch (err) {
    console.error('Error en updateAsignacion:', err.message);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
};

module.exports = {
  asignarResponsable,
  obtenerResponsables,
  obtenerMisAsignaciones,
  actualizarAsignacion
};
