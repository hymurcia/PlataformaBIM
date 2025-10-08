const pool = require('../db'); // tu conexión a PostgreSQL

// Obtener todas las ubicaciones
const obtenerUbicaciones = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, area, bloque, piso, salon FROM ubicaciones');
    res.json(result.rows); // devuelve [{ id, nombre }, ...]
  } catch (error) {
    console.error('Error en getUbicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nueva ubicación
const crearUbicaciones = async (req, res) => {
  try {
    const { area, bloque, piso, salon } = req.body;

    // Validación: debe completar Área o Bloque + Piso + Salón
    if (!area && !(bloque && piso && salon)) {
      return res.status(400).json({
        error: "Debes completar Área o Bloque + Piso + Salón",
      });
    }

    // Insertar en la tabla
    const result = await pool.query(
      `INSERT INTO ubicaciones (area, bloque, piso, salon)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [area || null, bloque || null, piso || null, salon || null]
    );

    res.status(201).json({ ubicacion: result.rows[0] });
  } catch (err) {
    console.error(err);
    // Manejar error de nombre único si existe
    if (err.code === "23505") {
      return res.status(400).json({ error: "La ubicación ya existe" });
    }
    res.status(500).json({ error: "Error creando la ubicación" });
  }
};


module.exports = { obtenerUbicaciones , crearUbicaciones };
