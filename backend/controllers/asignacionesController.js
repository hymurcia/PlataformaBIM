const pool = require('../db'); // conexión a la BD

// =====================
// Asignar responsable a incidente
// =====================
const asignarResponsable = async (req, res) => {
  try {
    const { incidente_id, usuario_id, comentarios } = req.body; // 👈 ahora se recibe usuario_id
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

    // 2. Verificar que el responsable existe y está activo
    const responsable = await pool.query(
      `SELECT r.usuario_id, u.nombre, u.email 
       FROM responsables r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id = $1 AND r.activo = true`,
      [usuario_id]
    );

    if (responsable.rows.length === 0) {
      return res.status(400).json({ error: 'Responsable no válido o inactivo' });
    }

    // 3. Crear asignación usando usuario_id en lugar de r.id
    const { rows } = await pool.query(
      `INSERT INTO asignaciones 
        (incidente_id, responsable_id, comentarios, estado_asignacion, fecha_asignacion)
       VALUES ($1, $2, $3, 'pendiente', NOW())
       RETURNING *`,
      [incidente_id, usuario_id, comentarios]
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
const getResponsables = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.usuario_id,           -- 👈 devolvemos usuario_id directamente
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
const getMisAsignaciones = async (req, res) => {
  try {
    const user_id = req.user.id; // este es el usuario_id

    // --- 1. Incidentes asignados ---
    const incidentes = await pool.query(
      `
      SELECT 
        a.id as tarea_id,
        'incidente' as tipo_tarea,
        i.titulo,
        i.descripcion,
        i.estado,
        a.estado_asignacion,
        a.fecha_asignacion,
        a.comentarios as comentarios_asignacion
      FROM asignaciones a
      JOIN incidente i ON a.incidente_id = i.id
      WHERE a.responsable_id = $1
      AND a.estado_asignacion != 'resuelto'
      ORDER BY a.fecha_asignacion DESC
      `,
      [user_id]
    );

    // --- 2. Mantenimientos asignados ---
    const mantenimientos = await pool.query(
      `
      SELECT 
        m.id as tarea_id,
        'mantenimiento' as tipo_tarea,
        m.nombre as titulo,
        m.descripcion,
        m.estado,
        NULL as estado_asignacion,
        m.fecha_programada as fecha_asignacion,
        m.comentarios as comentarios_asignacion
      FROM mantenimientos m
      WHERE m.operario_id = $1
      AND m.estado != 'resuelto'
      ORDER BY m.fecha_programada DESC
      `,
      [user_id]
    );

    // Unificar resultados
    const tareas = [...incidentes.rows, ...mantenimientos.rows];

    res.json(tareas);
  } catch (err) {
    console.error('Error en getMisAsignaciones:', err.message);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
};

// =====================
// Actualizar estado de asignación
// =====================
const updateAsignacion = async (req, res) => {
  try {
    const { id } = req.params; // id de la asignación
    const { estado, comentarios } = req.body;
    const user_id = req.user.id;

    // Verificar que el usuario es responsable de la asignación
    const verificacion = await pool.query(
      `
      SELECT a.id, a.incidente_id
      FROM asignaciones a
      WHERE a.id = $1 AND a.responsable_id = $2
      `,
      [id, user_id]
    );

    // Solo el responsable o un administrador/supervisor (rol_id = 2) puede actualizar
    if (verificacion.rows.length === 0 && req.user.rol_id !== 2) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Actualizar asignación
    const { rows } = await pool.query(
      `
      UPDATE asignaciones 
      SET 
        estado_asignacion = $1,
        comentarios = COALESCE($2, comentarios)
      WHERE id = $3
      RETURNING *
      `,
      [estado, comentarios, id]
    );

    // Si se marca como resuelto → cerrar incidente
    if (estado === 'resuelto' && verificacion.rows.length > 0) {
      await pool.query(
        'UPDATE incidente SET estado = $1, fecha_cierre = NOW() WHERE id = $2',
        ['resuelto', verificacion.rows[0].incidente_id]
      );
    }

    res.json({
      message: 'Asignación actualizada',
      asignacion: rows[0]
    });
  } catch (err) {
    console.error('Error en updateAsignacion:', err.message);
    res.status(500).json({ error: 'Error al actualizar asignación' });
  }
};

module.exports = {
  asignarResponsable,
  getResponsables,
  getMisAsignaciones,
  updateAsignacion
};
