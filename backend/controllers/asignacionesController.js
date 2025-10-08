const pool = require('../db');

// =====================
// Asignar responsable a incidente
// =====================
const asignarResponsable = async (req, res) => {
  try {
    const { incidente_id, responsable_id, comentarios, fecha_cierre } = req.body;
    const supervisorId = req.user.id;

    // 1️⃣ Verificar que el incidente exista
    const incidenteQuery = await pool.query(
      "SELECT id, estado, titulo FROM incidente WHERE id = $1",
      [incidente_id]
    );

    if (incidenteQuery.rows.length === 0) {
      return res.status(404).json({ error: "Incidente no encontrado" });
    }

    if (incidenteQuery.rows[0].estado === "resuelto") {
      return res.status(400).json({ error: "El incidente ya está resuelto" });
    }

    // 2️⃣ Verificar responsable
    const responsableQuery = await pool.query(
      `SELECT r.id AS responsable_id, r.usuario_id, r.especialidad, u.nombre, u.email
       FROM responsables r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id = $1 AND r.activo = true`,
      [responsable_id]
    );

    if (responsableQuery.rows.length === 0) {
      return res.status(400).json({ error: "Responsable no válido o inactivo" });
    }

    const responsableRealId = responsableQuery.rows[0].responsable_id;
    const usuarioResponsableId = responsableQuery.rows[0].usuario_id;

    // 3️⃣ Obtener nombre del supervisor
    const supervisorQuery = await pool.query(
      "SELECT nombre FROM usuarios WHERE id = $1",
      [supervisorId]
    );
    const nombreSupervisor = supervisorQuery.rows[0]?.nombre || "Supervisor";

    // 4️⃣ Crear asignación
    const { rows } = await pool.query(
      `INSERT INTO asignaciones 
       (incidente_id, responsable_id, comentarios, estado_asignacion, fecha_asignacion)
       VALUES ($1, $2, $3, 'pendiente', NOW())
       RETURNING *`,
      [incidente_id, responsableRealId, comentarios || null]
    );

    // 5️⃣ Actualizar incidente
    await pool.query(
      `UPDATE incidente 
       SET estado = $1,
           supervisor_asignador_id = $2,
           fecha_asignacion = NOW(),
           fecha_cierre = $3
       WHERE id = $4`,
      ["asignado", supervisorId, fecha_cierre || null, incidente_id]
    );

    // 6️⃣ Crear notificación con el nombre del supervisor
    const tituloNotif = "Nuevo incidente asignado";
    const mensajeNotif = `El supervisor ${nombreSupervisor} te ha asignado el incidente "${incidenteQuery.rows[0].titulo}".`;
    const tipoNotif = "asignacion";
    const linkNotif = `/incidentes/${incidente_id}`;

    await pool.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link, fecha_creacion, leida)
       VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)`,
      [usuarioResponsableId, tituloNotif, mensajeNotif, tipoNotif, linkNotif]
    );

    // 7️⃣ Emitir por Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`usuario_${usuarioResponsableId}`).emit("nueva_notificacion", {
        usuario_id: usuarioResponsableId,
        titulo: tituloNotif,
        mensaje: mensajeNotif,
        tipo: tipoNotif,
        link: linkNotif,
        fecha_creacion: new Date(),
        leida: false,
      });
    }

    // ✅ Respuesta final
    res.status(201).json({
      message: "Incidente asignado con éxito",
      asignacion: rows[0],
      responsable: responsableQuery.rows[0],
    });
  } catch (err) {
    console.error("❌ Error en asignarResponsable:", err.message);
    res.status(500).json({ error: "Error al asignar incidente" });
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

    console.log("🔍 Buscando asignaciones para usuario:", usuarioId);

    // 1. Buscar el responsable_id
    const responsableRes = await pool.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );

    if (responsableRes.rows.length === 0) {
      console.log("⚠️ Usuario no es responsable activo");
      return res.json([]);
    }

    const responsableId = responsableRes.rows[0].id;
    console.log("✅ Responsable encontrado con ID:", responsableId);

    // 2. Obtener incidentes asignados CON IMÁGENES
    let incidentes = [];
    try {
      const incidentesRes = await pool.query(
        `
          SELECT 
            a.id AS tarea_id,
            'incidente' AS tipo_tarea,
            i.id AS incidente_id,
            i.titulo,
            i.gravedad, -- ✅ agregado
            COALESCE(i.descripcion, 'Sin descripción') AS descripcion,
            i.estado,
            a.estado_asignacion,
            a.fecha_asignacion,
            i.fecha_cierre,
            COALESCE(a.comentarios, 'Sin comentarios') AS comentarios_asignacion,
            i.acciones_tomadas,
            NULL AS fecha_programada,
            NULL AS fecha_ultima_ejecucion,
            NULL AS componente_id,
            NULL AS componente_nombre,
            i.ubicacion_id,
            COALESCE(ubi.nombre, 'Sin ubicación') AS ubicacion_nombre,
            NULL AS frecuencia,
            0 AS dias_retraso,
            'media' AS prioridad,
            ur.nombre AS responsable_nombre,
            us.nombre AS supervisor_nombre,
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
          LEFT JOIN responsables r ON a.responsable_id = r.id
          LEFT JOIN usuarios ur ON r.usuario_id = ur.id
          LEFT JOIN usuarios us ON i.supervisor_asignador_id = us.id
          WHERE a.responsable_id = $1
            AND a.estado_asignacion IN ('pendiente', 'en_progreso', 'asignado')
          ORDER BY a.fecha_asignacion DESC;
        `,
        [responsableId]
      );

      incidentes = incidentesRes.rows;
      console.log(`📊 ${incidentes.length} incidentes encontrados con imágenes`);
    } catch (incidenteError) {
      console.error("❌ Error al obtener incidentes:", incidenteError.message);
      incidentes = [];
    }

    // 3. Obtener mantenimientos asignados (sin imágenes - tabla no existe)
    let mantenimientos = [];
    try {
      const mantenimientosRes = await pool.query(
        `
        SELECT 
          m.id AS tarea_id,
          'mantenimiento' AS tipo_tarea,
          COALESCE(m.nombre, 'Sin título') AS titulo,
          COALESCE(m.descripcion, 'Sin descripción') AS descripcion,
          m.estado,
          'pendiente' AS estado_asignacion,
          COALESCE(m.fecha_programada, NOW()) AS fecha_asignacion,
          COALESCE(m.comentarios, 'Sin comentarios') AS comentarios_asignacion,
          NULL AS acciones_tomadas,
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
          NULL AS fecha_cierre,
          NULL AS supervisor_nombre,
          NULL AS responsable_nombre,
          '[]'::json AS imagenes
        FROM mantenimientos m
        LEFT JOIN componentes c ON m.componente_id = c.id
        LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
        WHERE m.operario_id = $1
          AND m.estado IN ('pendiente', 'asignado')
        ORDER BY m.fecha_programada ASC
        `,
        [usuarioId]
      );
      mantenimientos = mantenimientosRes.rows;
      console.log(`🔧 ${mantenimientos.length} mantenimientos encontrados (sin imágenes)`);
    } catch (mantenimientoError) {
      console.error("❌ Error al obtener mantenimientos:", mantenimientoError.message);
      mantenimientos = [];
    }

    // 4. Combinar y ordenar resultados
    const todasLasTareas = [...incidentes, ...mantenimientos].sort(
      (a, b) => new Date(b.fecha_asignacion) - new Date(a.fecha_asignacion)
    );

    console.log(`🎯 Total de tareas encontradas: ${todasLasTareas.length}`);

    res.json(todasLasTareas);
  } catch (err) {
    console.error("❌ Error crítico en obtenerMisAsignaciones:", err.message);
    res.status(500).json({
      error: "Error interno del servidor al obtener asignaciones",
      detalles: err.message,
    });
  }
};

const actualizarAsignacion = async (req, res) => {
  const client = await pool.connect();
  try {
    const asignacionId = req.params.id;
    const { estado, comentarios, tipo } = req.body;
    const usuarioId = req.user.id;

    console.log(`🔄 Actualizando asignación ID=${asignacionId}, tipo=${tipo}, estado=${estado}, usuario=${usuarioId}`);

    // 1️⃣ Validar usuario responsable activo
    const respRes = await client.query(
      `SELECT id FROM responsables WHERE usuario_id = $1 AND activo = true`,
      [usuarioId]
    );
    const responsable = respRes.rows[0];
    if (!responsable) {
      return res.status(403).json({ error: "No eres un responsable válido" });
    }

    await client.query("BEGIN");
    let resultado = null;

    // 🟢 CASO 1: INCIDENTE
    if (tipo === "incidente") {
      const asignacionRes = await client.query(
        `SELECT a.*, 
                i.id AS incidente_id, 
                i.titulo AS incidente_titulo,
                i.solicitante_id, 
                i.estado AS incidente_estado,
                u.nombre AS solicitante_nombre
         FROM asignaciones a
         JOIN incidente i ON a.incidente_id = i.id
         JOIN usuarios u ON i.solicitante_id = u.id
         WHERE a.id = $1 AND a.responsable_id = $2`,
        [asignacionId, responsable.id]
      );

      if (asignacionRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "No tienes permiso para actualizar esta asignación" });
      }

      const asignacionActual = asignacionRes.rows[0];

      // 2️⃣ Actualizar estado y comentarios
      const updateAsignacionRes = await client.query(
        `UPDATE asignaciones
         SET estado_asignacion = $1,
             comentarios = $2
         WHERE id = $3
         RETURNING *`,
        [estado, comentarios || null, asignacionId]
      );
      resultado = updateAsignacionRes.rows[0];

      // 3️⃣ Si se resolvió el incidente
      const estadoCompletado = ["completado", "resuelto"].includes(estado);
      if (estadoCompletado) {
        const accionesPrev = asignacionActual.acciones_tomadas || null;
        const nuevasAcciones = comentarios
          ? (accionesPrev ? `${accionesPrev}\n${comentarios}` : comentarios)
          : accionesPrev;

        await client.query(
          `UPDATE incidente
           SET estado = 'resuelto',
               fecha_cierre = NOW(),
               acciones_tomadas = $1
           WHERE id = $2`,
          [nuevasAcciones, asignacionActual.incidente_id]
        );

        // 4️⃣ Crear notificación personalizada
        const solicitanteId = asignacionActual.solicitante_id;
        const solicitanteNombre = asignacionActual.solicitante_nombre;
        const tituloNotif = "Incidente resuelto";
        const mensajeNotif = `Hola ${solicitanteNombre}, el incidente "${asignacionActual.incidente_titulo}" ha sido marcado como resuelto por el responsable.`;
        const tipoNotif = "incidente_resuelto";
        const linkNotif = `/incidentes/${asignacionActual.incidente_id}`;

        await client.query(
          `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, link, fecha_creacion, leida)
           VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)`,
          [solicitanteId, tituloNotif, mensajeNotif, tipoNotif, linkNotif]
        );

        // 5️⃣ Emitir Socket.IO
        const io = req.app.get("io");
        if (io) {
          io.to(`usuario_${solicitanteId}`).emit("nueva_notificacion", {
            usuario_id: solicitanteId,
            titulo: tituloNotif,
            mensaje: mensajeNotif,
            tipo: tipoNotif,
            link: linkNotif,
            fecha_creacion: new Date(),
            leida: false,
          });
        }
      }

      // 🟢 CASO 2: MANTENIMIENTO
    } else if (tipo === "mantenimiento") {
      const mantenimientoRes = await client.query(
        `SELECT * FROM mantenimientos WHERE id = $1 AND operario_id = $2`,
        [asignacionId, usuarioId]
      );
      if (mantenimientoRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "No tienes permiso para actualizar este mantenimiento" });
      }

      const updateMantenimientoRes = await client.query(
        `UPDATE mantenimientos
         SET estado = $1,
             comentarios = $2,
             fecha_ultima_ejecucion = CASE WHEN $1 = 'completado' THEN NOW() ELSE fecha_ultima_ejecucion END
         WHERE id = $3
         RETURNING *`,
        [estado, comentarios || null, asignacionId]
      );
      resultado = updateMantenimientoRes.rows[0];
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Tipo de tarea no válido o ausente" });
    }

    await client.query("COMMIT");
    return res.json({ message: "Tarea actualizada con éxito", result: resultado, tipo });

  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) { }
    console.error("❌ Error en actualizarAsignacion:", err);
    return res.status(500).json({ error: "Error al actualizar la tarea", detalles: err.message });
  } finally {
    client.release();
  }
};


module.exports = {
  asignarResponsable,
  obtenerResponsables,
  obtenerMisAsignaciones,
  actualizarAsignacion
};