const pool = require('../db');

// Obtener métricas generales
const obtenerMetricas = async (req, res) => {
  try {
    // Métricas generales
    const generales = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'pendiente_verificacion' THEN 1 END) as pendientes_verificacion,
        COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
        COUNT(CASE WHEN estado = 'rechazado' THEN 1 END) as rechazados,
        COUNT(CASE WHEN solicitante_id IS NULL THEN 1 END) as invitados
      FROM incidente
    `);

    // Resolución por tipo
    const porTipo = await pool.query(`
      SELECT 
        i.tipo,
        COUNT(*) as total,
        COUNT(CASE WHEN i.estado = 'resuelto' THEN 1 END) as resueltos,
        ROUND(AVG(EXTRACT(EPOCH FROM (i.fecha_cierre - i.fecha_creacion)) / 3600)::numeric, 2) as tiempo_promedio
      FROM incidente i
      JOIN usuarios u ON u.id = i.solicitante_id
      WHERE i.estado = 'resuelto'
      GROUP BY i.tipo
    `);

    // Eficiencia de responsables
    const responsables = await pool.query(`
      SELECT 
        u.nombre,
        COUNT(a.id) as tareas_asignadas,
        COUNT(CASE WHEN a.estado_asignacion = 'completado' THEN 1 END) as tareas_completadas,
        ROUND(AVG(EXTRACT(EPOCH FROM (i.fecha_cierre - i.fecha_creacion)) / 3600)::numeric, 2) as tiempo_promedio
      FROM asignaciones a
      JOIN responsables r ON a.responsable_id = r.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN incidente i ON a.incidente_id = i.id
      WHERE i.estado = 'resuelto'
      GROUP BY u.nombre
      ORDER BY tareas_completadas DESC
      LIMIT 5
    `);

    // Tendencia mensual
    const tendencia = await pool.query(`
      SELECT 
        DATE_TRUNC('month', fecha_creacion) as mes,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos
      FROM incidente
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6
    `);

    res.json({
      generales: generales.rows[0],
      porTipo: porTipo.rows,
      responsables: responsables.rows,
      tendencia: tendencia.rows
    });
  } catch (err) {
    console.error('Error en obtenerMetricas:', err.message);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
};

module.exports = { obtenerMetricas };
