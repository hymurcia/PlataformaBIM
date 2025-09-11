const pool = require('../db');

// Obtener métricas de incidentes
const obtenerMetricas = async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    
    // Métricas generales de incidentes
    const generales = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendiente,
        COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignado,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resuelto,
        COUNT(CASE WHEN estado = 'rechazado' THEN 1 END) as rechazado,
        COUNT(CASE WHEN solicitante_id IS NULL THEN 1 END) as invitados
      FROM incidente
      WHERE fecha_creacion BETWEEN $1 AND $2
    `, [inicio, fin]);

    // Resolución por tipo
    const porTipo = await pool.query(`
      SELECT 
        i.tipo,
        COUNT(*) as total,
        COUNT(CASE WHEN i.estado = 'resuelto' THEN 1 END) as resueltos,
        ROUND(AVG(EXTRACT(EPOCH FROM (i.fecha_cierre - i.fecha_creacion)) / 3600)::numeric, 2) as tiempo_promedio_horas
      FROM incidente i
      WHERE i.fecha_creacion BETWEEN $1 AND $2
      GROUP BY i.tipo
    `, [inicio, fin]);

    // Eficiencia de responsables
    const responsables = await pool.query(`
      SELECT 
        u.nombre,
        COUNT(a.id) as tareas_asignadas,
        COUNT(CASE WHEN i.estado = 'resuelto' THEN 1 END) as tareas_completadas,
        ROUND(AVG(EXTRACT(EPOCH FROM (i.fecha_cierre - i.fecha_creacion)) / 3600)::numeric, 2) as tiempo_promedio_horas
      FROM asignaciones a
      JOIN responsables r ON a.responsable_id = r.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN incidente i ON a.incidente_id = i.id
      WHERE i.fecha_creacion BETWEEN $1 AND $2
      GROUP BY u.nombre
      ORDER BY tareas_completadas DESC
      LIMIT 5
    `, [inicio, fin]);

    // Tendencia mensual
    const tendencia = await pool.query(`
      SELECT 
        DATE_TRUNC('month', fecha_creacion) as mes,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos
      FROM incidente
      WHERE fecha_creacion BETWEEN $1 AND $2
      GROUP BY mes
      ORDER BY mes ASC
    `, [inicio, fin]);

    res.json({
      generales: generales.rows[0],
      porTipo: porTipo.rows,
      responsables: responsables.rows,
      tendencia: tendencia.rows
    });
  } catch (err) {
    console.error('Error en obtenerMetricas:', err.message);
    res.status(500).json({ 
      error: 'Error al obtener métricas',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Obtener métricas de mantenimientos
const obtenerMetricasMantenimientos = async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    // Métricas generales de mantenimientos
    const generales = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendiente,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completado,
        COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as cancelado
      FROM mantenimientos
      WHERE fecha_programada BETWEEN $1 AND $2
    `, [inicio, fin]);

    // Métricas por frecuencia
    const porFrecuencia = await pool.query(`
      SELECT 
        frecuencia,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
        ROUND(AVG(EXTRACT(EPOCH FROM (fecha_ultima_ejecucion - fecha_programada)) / 3600)::numeric, 2) as tiempo_promedio_horas
      FROM mantenimientos
      WHERE fecha_programada BETWEEN $1 AND $2
      GROUP BY frecuencia
    `, [inicio, fin]);

    // Eficiencia por operario
    const operarios = await pool.query(`
      SELECT 
        u.nombre,
        COUNT(m.id) as mantenimientos_asignados,
        COUNT(CASE WHEN m.estado = 'completado' THEN 1 END) as completados,
        ROUND(AVG(EXTRACT(EPOCH FROM (m.fecha_ultima_ejecucion - m.fecha_programada)) / 3600)::numeric, 2) as tiempo_promedio_horas
      FROM mantenimientos m
      JOIN usuarios u ON m.operario_id = u.id
      WHERE m.fecha_programada BETWEEN $1 AND $2
      GROUP BY u.nombre
      ORDER BY completados DESC
      LIMIT 5
    `, [inicio, fin]);

    // Tendencia mensual de mantenimientos
    const tendencia = await pool.query(`
      SELECT 
        DATE_TRUNC('month', fecha_programada) as mes,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados
      FROM mantenimientos
      WHERE fecha_programada BETWEEN $1 AND $2
      GROUP BY mes
      ORDER BY mes ASC
    `, [inicio, fin]);

    res.json({
      generales: generales.rows[0],
      porFrecuencia: porFrecuencia.rows,
      operarios: operarios.rows,
      tendencia: tendencia.rows
    });
  } catch (err) {
    console.error('Error en obtenerMetricasMantenimientos:', err.message);
    res.status(500).json({ 
      error: 'Error al obtener métricas de mantenimientos',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = { 
  obtenerMetricas,
  obtenerMetricasMantenimientos
};
