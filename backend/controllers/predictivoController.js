const pool = require('../db'); // Tu pool de PostgreSQL
const axios = require('axios'); // Reemplaza node-fetch por axios
const { notificar } = require("../utils/notificar"); // 🔔 Helper de notificaciones

// 🔑 Configuración OpenWeather
const API_KEY = 'ee2ea746561151f1d7ceb05f75e004eb';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const CITY = 'Facatativa';

// ================= Función para obtener clima actual =================
const obtenerClimaActual = async () => {
  try {
    const url = `${BASE_URL}?q=${CITY}&appid=${API_KEY}&units=metric&lang=es`;
    const resp = await axios.get(url);
    return resp.data;
  } catch (error) {
    console.error("Error al obtener clima:", error.response?.data || error.message);
    throw new Error("No se pudo obtener el clima actual");
  }
};

// ================= Función para evaluar decisión de mantenimiento =================
const evaluarMantenimiento = (weatherData) => {
  const clima = weatherData.weather[0].main.toLowerCase();
  const lluvia = weatherData.rain?.['1h'] || 0;

  if (clima.includes('rain') || lluvia > 2) {
    return { decision: 'Reprogramar', razon: 'Se espera lluvia fuerte' };
  }
  if (clima.includes('clear')) {
    return { decision: 'Adelantar', razon: 'Clima despejado, se puede adelantar' };
  }
  return { decision: 'Mantener', razon: 'Clima moderado' };
};

// ================= Función para obtener mantenimientos de la semana =================
const obtenerMantenimientosSemana = async () => {
  const hoy = new Date();
  const primerDia = new Date(hoy);
  primerDia.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1)); // Lunes
  primerDia.setHours(0, 0, 0, 0);

  const ultimoDia = new Date(primerDia);
  ultimoDia.setDate(primerDia.getDate() + 6); // Domingo
  ultimoDia.setHours(23, 59, 59, 999);

  const query = `
    SELECT id, nombre, fecha_programada, estado
    FROM mantenimientos
    WHERE fecha_programada::date BETWEEN $1::date AND $2::date
    ORDER BY fecha_programada
  `;
  const { rows: mantenimientos } = await pool.query(query, [primerDia, ultimoDia]);
  return mantenimientos;
};

// ================= Función para enviar notificación diaria a roles administrativos =================
const notificarDecisionDiaria = async (mantenimientos) => {
  // Filtrar solo decisiones que requieren acción
  const decisionesImportantes = mantenimientos.filter(m => m.decision === 'Reprogramar' || m.decision === 'Adelantar');
  if (decisionesImportantes.length === 0) return; // No hay nada que notificar

  // Evitar notificar más de una vez al día
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { rows: yaNotificado } = await pool.query(
    `SELECT 1 FROM log_notificaciones WHERE tipo = 'mantenimiento_predictivo' AND fecha = $1`,
    [hoy]
  );
  if (yaNotificado.length > 0) return; // Ya se notificó hoy

  // Obtener todos los administradores (rol_id = 2)
  const { rows: admins } = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);

  // Enviar notificación a cada admin
  for (const admin of admins) {
    const mensajes = decisionesImportantes
      .map(m => `${m.nombre} -> ${m.decision}: ${m.razon}`)
      .join('\n');
    await notificar({
      usuario_id: admin.id,
      titulo: "Mantenimientos de la semana",
      mensaje: mensajes,
      tipo: "alerta",
      link: `/mantenimientos`
    });
  }

  // Registrar que ya se notificó hoy
  await pool.query(
    `INSERT INTO log_notificaciones(tipo, fecha) VALUES($1, $2)`,
    ['mantenimiento_predictivo', hoy]
  );
};

// ================= Endpoint principal =================
const obtenerMantenimientoDecision = async (req, res) => {
  try {
    // 1️⃣ Obtener mantenimientos de la semana
    const mantenimientos = await obtenerMantenimientosSemana();
    if (mantenimientos.length === 0) {
      return res.json({ message: 'No hay mantenimientos programados esta semana', mantenimientos: [] });
    }

    // 2️⃣ Obtener clima actual
    const weatherData = await obtenerClimaActual();

    // 3️⃣ Agregar decisión predictiva a cada mantenimiento
    const mantenimientosConDecision = mantenimientos.map(m => {
      const decision = evaluarMantenimiento(weatherData);
      return { ...m, decision: decision.decision, razon: decision.razon };
    });

    // 4️⃣ Enviar notificación diaria a administradores
    await notificarDecisionDiaria(mantenimientosConDecision);

    // 5️⃣ Responder con la lista de mantenimientos y decisiones
    return res.json({ mantenimientos: mantenimientosConDecision });
  } catch (error) {
    console.error('Error en módulo predictivo:', error);
    return res.status(500).json({ error: 'Error interno en el módulo predictivo' });
  }
};

module.exports = { obtenerMantenimientoDecision };
