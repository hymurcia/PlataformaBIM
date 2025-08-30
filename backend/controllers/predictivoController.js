const pool = require('../db'); // tu pool de PostgreSQL

const API_KEY = 'ee2ea746561151f1d7ceb05f75e004eb';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const CITY = 'Facatativa';

// --- Obtener clima actual ---
const getCurrentWeather = async () => {
  const url = `${BASE_URL}?q=${CITY}&appid=${API_KEY}&units=metric&lang=es`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const errorData = await resp.json();
    throw new Error(JSON.stringify(errorData));
  }
  const data = await resp.json();
  return data;
};

// --- Reglas predictivas ---
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

// --- Endpoint: mantenimientos del mes con sugerencias ---
const getMantenimientoDecision = async (req, res) => {
  try {
    // 1️⃣ Calcular primer y último día del mes actual
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    // 2️⃣ Consultar mantenimientos programados del mes
    const query = `
      SELECT id, nombre, fecha_programada, estado
      FROM mantenimientos
      WHERE fecha_programada BETWEEN $1 AND $2
      ORDER BY fecha_programada
    `;
    const { rows: mantenimientos } = await pool.query(query, [primerDia, ultimoDia]);

    if (mantenimientos.length === 0) {
      return res.json({ message: 'No hay mantenimientos programados este mes', mantenimientos: [] });
    }

    // 3️⃣ Obtener clima actual
    const weatherData = await getCurrentWeather();

    // 4️⃣ Agregar decisión predictiva a cada mantenimiento
    const mantenimientosConDecision = mantenimientos.map(m => {
      const decision = evaluarMantenimiento(weatherData);
      return { ...m, decision: decision.decision, razon: decision.razon };
    });

    return res.json({ mantenimientos: mantenimientosConDecision });
  } catch (error) {
    console.error('Error en módulo predictivo:', error);
    return res.status(500).json({ error: 'Error interno en el módulo predictivo' });
  }
};

module.exports = { getMantenimientoDecision };
