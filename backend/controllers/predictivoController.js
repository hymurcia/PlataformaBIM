const pool = require('../db'); // Pool de conexión PostgreSQL
const axios = require('axios'); // Cliente HTTP
const { notificar } = require("../utils/notificar"); // 🔔 Helper de notificaciones

// ==================== 🔑 Configuración de OpenWeather ====================
const API_KEY = 'ee2ea746561151f1d7ceb05f75e004eb';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const CITY = 'Facatativa';

// ==================== 🌤 Obtener clima actual ====================
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

// ==================== 🧠 Evaluar decisión de mantenimiento ====================
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

// ==================== 📅 Obtener mantenimientos de la semana ====================
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
      AND estado != 'cancelado'               -- ❌ Excluir los cancelados
    ORDER BY fecha_programada
  `;
  const { rows: mantenimientos } = await pool.query(query, [primerDia, ultimoDia]);
  return mantenimientos;
};

// ==================== 🔔 Notificar decisiones importantes ====================
const notificarDecisionDiaria = async (mantenimientos) => {
  // Filtrar mantenimientos que requieren acción
  const decisionesImportantes = mantenimientos.filter(
    m => m.decision === 'Reprogramar' || m.decision === 'Adelantar'
  );

  if (decisionesImportantes.length === 0) return; // No hay decisiones relevantes

  // Obtener administradores (rol_id = 2)
  const { rows: admins } = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);

  // Enviar notificación a cada admin
  for (const admin of admins) {
    const mensajes = decisionesImportantes
      .map(m => `${m.nombre} → ${m.decision}: ${m.razon}`)
      .join('\n');

    await notificar({
      usuario_id: admin.id,
      titulo: "Mantenimientos de la semana",
      mensaje: mensajes,
      tipo: "alerta",
      link: `/mantenimientos`
    });
  }
};

// ==================== 🚀 Endpoint principal ====================
const obtenerMantenimientoDecision = async (req, res) => {
  try {
    // 1️⃣ Obtener mantenimientos de la semana
    const mantenimientos = await obtenerMantenimientosSemana();
    if (mantenimientos.length === 0) {
      return res.json({
        message: 'No hay mantenimientos programados esta semana',
        mantenimientos: []
      });
    }

    // 2️⃣ Obtener clima actual
    const weatherData = await obtenerClimaActual();

    // 3️⃣ Calcular decisión predictiva para cada mantenimiento
    const mantenimientosConDecision = mantenimientos.map(m => {
      const decision = evaluarMantenimiento(weatherData);
      return { ...m, decision: decision.decision, razon: decision.razon };
    });

    // 4️⃣ Notificar decisiones importantes
    await notificarDecisionDiaria(mantenimientosConDecision);

    // 5️⃣ Responder al cliente
    return res.json({ mantenimientos: mantenimientosConDecision });

  } catch (error) {
    console.error('Error en módulo predictivo:', error);
    return res.status(500).json({ error: 'Error interno en el módulo predictivo' });
  }
};

module.exports = { obtenerMantenimientoDecision };



// const pool = require('../db');
// const axios = require('axios');
// const { notificar } = require("../utils/notificar");

// // 🔑 Configuración de OpenWeather
// const API_KEY = 'ee2ea746561151f1d7ceb05f75e004eb';
// const BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast'; // 🔮 Pronóstico a 5 días
// const CITY = 'Facatativa';

// // ================= Obtener pronóstico climático (5 días) =================
// const obtenerPronostico = async () => {
//   try {
//     const url = `${BASE_URL}?q=${CITY}&appid=${API_KEY}&units=metric&lang=es`;
//     const resp = await axios.get(url);
//     return resp.data; // Devuelve una lista de pronósticos cada 3 horas
//   } catch (error) {
//     console.error("Error al obtener pronóstico:", error.response?.data || error.message);
//     throw new Error("No se pudo obtener el pronóstico climático");
//   }
// };

// // ================= Evaluar mantenimiento según pronóstico =================
// const evaluarMantenimientoConPronostico = (weatherData, fechaMantenimiento) => {
//   const fecha = new Date(fechaMantenimiento);
//   const año = fecha.getFullYear();
//   const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
//   const dia = fecha.getDate().toString().padStart(2, '0');
//   const fechaISO = `${año}-${mes}-${dia}`;

//   // Filtrar pronósticos del mismo día
//   const pronosticosDelDia = weatherData.list.filter(p => p.dt_txt.startsWith(fechaISO));

//   if (pronosticosDelDia.length === 0) {
//     return { decision: 'Mantener', razon: 'No hay datos climáticos disponibles para esa fecha' };
//   }

//   // Evaluar condiciones del día
//   let lluviaTotal = 0;
//   let horasDespejadas = 0;

//   for (const p of pronosticosDelDia) {
//     const clima = p.weather[0].main.toLowerCase();
//     const lluvia = p.rain?.['3h'] || 0;
//     lluviaTotal += lluvia;
//     if (clima.includes('clear')) horasDespejadas++;
//   }

//   // 🔮 Reglas de decisión basadas en el pronóstico
//   if (lluviaTotal > 5) {
//     return { decision: 'Reprogramar', razon: 'Se pronostican lluvias fuertes ese día' };
//   } else if (horasDespejadas >= 3) {
//     return { decision: 'Adelantar', razon: 'Clima mayormente despejado, ideal para mantenimiento' };
//   } else {
//     return { decision: 'Mantener', razon: 'Clima variable o nublado moderado' };
//   }
// };

// // ================= Obtener mantenimientos de la semana =================
// const obtenerMantenimientosSemana = async () => {
//   const hoy = new Date();
//   const primerDia = new Date(hoy);
//   primerDia.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1)); // Lunes
//   primerDia.setHours(0, 0, 0, 0);

//   const ultimoDia = new Date(primerDia);
//   ultimoDia.setDate(primerDia.getDate() + 6); // Domingo
//   ultimoDia.setHours(23, 59, 59, 999);

//   const query = `
//     SELECT id, nombre, fecha_programada, estado
//     FROM mantenimientos
//     WHERE fecha_programada::date BETWEEN $1::date AND $2::date
//     ORDER BY fecha_programada
//   `;
//   const { rows } = await pool.query(query, [primerDia, ultimoDia]);
//   return rows;
// };

// // ================= Enviar notificación a administradores =================
// const notificarDecision = async (mantenimientos) => {
//   // Filtrar decisiones relevantes
//   const decisionesImportantes = mantenimientos.filter(m =>
//     m.decision === 'Reprogramar' || m.decision === 'Adelantar'
//   );

//   if (decisionesImportantes.length === 0) return;

//   // Obtener todos los administradores (rol_id = 2)
//   const { rows: admins } = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);

//   for (const admin of admins) {
//     const mensajes = decisionesImportantes
//       .map(m => `${m.nombre} (${new Date(m.fecha_programada).toLocaleDateString()}) → ${m.decision}: ${m.razon}`)
//       .join('\n');

//     await notificar({
//       usuario_id: admin.id,
//       titulo: "📅 Predicción de Mantenimientos Semanales",
//       mensaje: mensajes,
//       tipo: "alerta",
//       link: `/mantenimientos`
//     });
//   }

//   console.log("🔔 Notificaciones enviadas a administradores");
// };

// // ================= Endpoint principal =================
// const obtenerMantenimientoDecision = async (req, res) => {
//   try {
//     // 1️⃣ Obtener mantenimientos de la semana
//     const mantenimientos = await obtenerMantenimientosSemana();
//     if (mantenimientos.length === 0) {
//       return res.json({ message: 'No hay mantenimientos programados esta semana', mantenimientos: [] });
//     }

//     // 2️⃣ Obtener pronóstico a 5 días
//     const weatherData = await obtenerPronostico();

//     // 3️⃣ Aplicar decisiones predictivas
//     const mantenimientosConDecision = mantenimientos.map(m => {
//       const decision = evaluarMantenimientoConPronostico(weatherData, m.fecha_programada);
//       return { ...m, decision: decision.decision, razon: decision.razon };
//     });

//     // 4️⃣ Notificar decisiones relevantes
//     await notificarDecision(mantenimientosConDecision);

//     // 5️⃣ Enviar respuesta al frontend
//     return res.json({ mantenimientos: mantenimientosConDecision });

//   } catch (error) {
//     console.error('Error en módulo predictivo:', error);
//     return res.status(500).json({ error: 'Error interno en el módulo predictivo' });
//   }
// };

// module.exports = { obtenerMantenimientoDecision };
