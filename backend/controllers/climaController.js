const API_KEY = 'ee2ea746561151f1d7ceb05f75e004eb';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Obtener clima de Facatativá
const obtenerClimaFacatativa = async (req, res) => {
  const city = 'Facatativa';
  const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=es`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const errorData = await resp.json();
      return res.status(resp.status).json({ error: errorData });
    }
    const data = await resp.json();
    return res.json(data);
  } catch (error) {
    console.error('Error al obtener clima:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerClimaFacatativa
};
