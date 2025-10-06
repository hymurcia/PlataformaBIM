const pool = require('../db');

// =====================
// Asignar responsable a incidente
// =====================
const asignarResponsable = async (req, res) => {
  try {
    const { incidente_id, responsable_id, comentarios } = req.body;
    const supervisorId = req.user.id;

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
      `SELECT r.id AS responsable_id, r.usuario_id, r.especialidad, u.nombre, u.email
       FROM responsables r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id = $1 AND r.activo = true`,
      [responsable_id]
    );

    if (responsable.rows.length === 0) {
      return res.status(400).json({ error: 'Responsable no válido o inactivo' });
    }

    const responsableRealId = responsable.rows[0].responsable_id;

    // 3. Crear asignación
    const { rows } = await pool.query(
      `INSERT INTO asignaciones 
       (incidente_id, responsable_id, comentarios, estado_asignacion, fecha_asignacion)
       VALUES ($1, $2, $3, 'pendiente', NOW())
       RETURNING *`,
      [incidente_id, responsableRealId, comentarios || null]
    );

    // 4. Actualizar incidente
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
        r.usuario_id AS id,
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
    console.error('Error en obtenerResponsables:', err.message);
    res.status(500).json({ error: 'Error al obtener responsables' });
  }
};

// =====================
// Obtener tareas de un responsable (incidentes + mantenimientos) CON IMÁGENES
// =====================
const obtenerMisAsignaciones = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    console.log('🔍 Buscando asignaciones para usuario:', usuarioId);

    // 1. Buscar el responsable_id
    const responsableRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );

    if (responsableRes.rows.length === 0) {
      console.log('⚠️  Usuario no es responsable activo');
      return res.json([]);
    }

    const responsableId = responsableRes.rows[0].id;
    console.log('✅ Responsable encontrado con ID:', responsableId);

    // 2. Obtener incidentes asignados CON IMÁGENES
    let incidentes = [];
    try {
      const incidentesRes = await pool.query(
        `SELECT 
          a.id AS tarea_id,
          'incidente' AS tipo_tarea,
          i.titulo,
          i.descripcion,
          i.estado,
          a.estado_asignacion,
          a.fecha_asignacion,
          a.comentarios AS comentarios_asignacion,
          NULL AS fecha_programada,
          NULL AS fecha_ultima_ejecucion,
          NULL AS componente_id,
          NULL AS componente_nombre,
          i.ubicacion_id,
          COALESCE(ubi.nombre, 'Sin ubicación') AS ubicacion_nombre,
          NULL AS frecuencia,
          0 AS dias_retraso,
          'media' AS prioridad,
          -- Obtener imágenes del incidente
          (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'id', im.id,
                  'url', im.url,
                  'descripcion', COALESCE(im.descripcion, '')
                )
              ), '[]'::json
            )
            FROM imagenes_incidente im 
            WHERE im.incidente_id = i.id
          ) AS imagenes
        FROM asignaciones a
        JOIN incidente i ON a.incidente_id = i.id
        LEFT JOIN ubicaciones ubi ON i.ubicacion_id = ubi.id
        WHERE a.responsable_id = $1
        AND a.estado_asignacion IN ('pendiente', 'en_progreso')
        ORDER BY a.fecha_asignacion DESC`,
        [responsableId]
      );
      incidentes = incidentesRes.rows;
      console.log(`📊 ${incidentes.length} incidentes encontrados con imágenes`);
    } catch (incidenteError) {
      console.error('❌ Error al obtener incidentes:', incidenteError.message);
      incidentes = [];
    }

    // 3. Obtener mantenimientos asignados (sin imágenes - tabla no existe)
    let mantenimientos = [];
    try {
      const mantenimientosRes = await pool.query(
        `SELECT 
          m.id AS tarea_id,
          'mantenimiento' AS tipo_tarea,
          m.nombre AS titulo,
          COALESCE(m.descripcion, 'Sin descripción') AS descripcion,
          m.estado,
          'pendiente' AS estado_asignacion,
          COALESCE(m.fecha_programada, NOW()) AS fecha_asignacion,
          COALESCE(m.comentarios, 'Sin comentarios') AS comentarios_asignacion,
          m.fecha_programada,
          m.fecha_ultima_ejecucion,
          m.componente_id,
          COALESCE(c.nombre, 'No asignado') AS componente_nombre,
          m.ubicacion_id,
          COALESCE(u.nombre, 'Sin ubicación') AS ubicacion_nombre,
          COALESCE(m.frecuencia, 'No definida') AS frecuencia,
          CASE 
            WHEN m.fecha_programada IS NOT NULL 
              AND CURRENT_DATE > m.fecha_programada::date 
            THEN (CURRENT_DATE - m.fecha_programada::date)
            ELSE 0
          END AS dias_retraso,
          'media' AS prioridad,
          m.dias,
          '[]'::json AS imagenes  -- Array vacío para imágenes (tabla no existe)
        FROM mantenimientos m
        LEFT JOIN componentes c ON m.componente_id = c.id
        LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
        WHERE m.operario_id = $1
          AND m.estado IN ('pendiente', 'asignado')
        ORDER BY m.fecha_programada ASC`,
        [usuarioId]
      );
      mantenimientos = mantenimientosRes.rows;
      console.log(`🔧 ${mantenimientos.length} mantenimientos encontrados (sin imágenes)`);
    } catch (mantenimientoError) {
      console.error('❌ Error al obtener mantenimientos:', mantenimientoError.message);
      mantenimientos = [];
    }

    // 4. Combinar resultados
    const todasLasTareas = [...incidentes, ...mantenimientos];
    
    console.log(`🎯 Total de tareas encontradas: ${todasLasTareas.length}`);
    
    res.json(todasLasTareas);

  } catch (err) {
    console.error('❌ Error crítico en obtenerMisAsignaciones:', err.message);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener asignaciones',
      detalles: err.message 
    });
  }
};

// =====================
// Actualizar estado de asignación
// =====================
const actualizarAsignacion = async (req, res) => {
  try {
    const asignacionId = req.params.id;
    const { estado, comentarios, tipo } = req.body;
    const usuarioId = req.user.id;

    console.log(`🔄 Actualizando ${tipo} ${asignacionId} a estado: ${estado}`);

    // Validar que el usuario sea responsable activo
    const respRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );
    
    const responsable = respRes.rows[0];
    if (!responsable) {
      return res.status(403).json({ error: "No eres un responsable válido" });
    }

    let resultado;

    if (tipo === 'incidente') {
      // Validar permisos para esta asignación de incidente
      const asignacionRes = await pool.query(
        `SELECT * FROM asignaciones WHERE id = $1 AND responsable_id = $2`,
        [asignacionId, responsable.id]
      );

      if (asignacionRes.rows.length === 0) {
        return res.status(403).json({ error: "No tienes permiso para actualizar esta asignación" });
      }

      // Actualizar asignación
      const { rows } = await pool.query(
        `UPDATE asignaciones
         SET estado_asignacion = $1,
             comentarios = $2
         WHERE id = $3
         RETURNING *`,
        [estado, comentarios || null, asignacionId]
      );

      resultado = rows[0];

      // Si se completó, actualizar el incidente
      if (estado === 'completado') {
        await pool.query(
          `UPDATE incidente
           SET estado = 'resuelto',
               fecha_cierre = NOW()
           WHERE id = $1`,
          [asignacionRes.rows[0].incidente_id]
        );
      }

    } else if (tipo === 'mantenimiento') {
      // Validar permisos para este mantenimiento
      const mantenimientoRes = await pool.query(
        `SELECT * FROM mantenimientos WHERE id = $1 AND operario_id = $2`,
        [asignacionId, usuarioId]
      );

      if (mantenimientoRes.rows.length === 0) {
        return res.status(403).json({ error: "No tienes permiso para actualizar este mantenimiento" });
      }

      // Actualizar mantenimiento
      const { rows } = await pool.query(
        `UPDATE mantenimientos
         SET estado = $1,
             comentarios = $2,
             fecha_ultima_ejecucion = CASE WHEN $1 = 'completado' THEN NOW() ELSE fecha_ultima_ejecucion END
         WHERE id = $3
         RETURNING *`,
        [estado, comentarios || null, asignacionId]
      );

      resultado = rows[0];

    } else {
      return res.status(400).json({ error: "Tipo de tarea no válido" });
    }

    res.json({ 
      message: "Tarea actualizada con éxito", 
      [tipo]: resultado,
      tipo 
    });

  } catch (err) {
    console.error("❌ Error en actualizarAsignacion:", err.message);
    res.status(500).json({ 
      error: "Error al actualizar tarea",
      detalles: err.message 
    });
  }
};

module.exports = {
  asignarResponsable,
  obtenerResponsables,
  obtenerMisAsignaciones,
  actualizarAsignacion
};