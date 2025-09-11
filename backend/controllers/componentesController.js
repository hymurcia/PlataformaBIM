const pool = require('../db');
const { verifyToken } = require('../utils/jwt');

// 🔹 Middleware para validar token
const validarToken = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return verifyToken(token);
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return null;
  }
};

// 🔹 Calcular edad actual en meses
const calcularEdadActual = (fechaInstalacion) => {
  if (!fechaInstalacion) return 0;
  const hoy = new Date();
  const fecha = new Date(fechaInstalacion);
  const diffMeses =
    (hoy.getFullYear() - fecha.getFullYear()) * 12 +
    (hoy.getMonth() - fecha.getMonth());
  return diffMeses;
};

// 🔹 Determinar estado de revisión
const calcularEstadoRevision = (componente) => {
  const vidaUtil = componente.vida_util_meses || 0;
  const edad = calcularEdadActual(componente.fecha_instalacion);

  if (!vidaUtil) return 'Sin datos';

  const porcentajeVida = edad / vidaUtil;

  if (porcentajeVida >= 1) return 'Revisión inmediata';
  if (porcentajeVida >= 0.8) return 'Revisión próxima';
  return 'Operativo';
};

// 🔹 Listar todos los componentes
const obtenerComponentes = async (req, res) => {
  try {
    if (!validarToken(req, res)) return;
    const { rows } = await pool.query('SELECT * FROM componentes ORDER BY id');

    const componentes = rows.map(c => ({
      ...c,
      edad_actual: calcularEdadActual(c.fecha_instalacion),
      estado_revision: calcularEstadoRevision(c)
    }));

    res.json(componentes);
  } catch (err) {
    console.error("Error al obtener componentes:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔹 Obtener componente por ID
const obtenerComponenteById = async (req, res) => {
  try {
    if (!validarToken(req, res)) return;
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM componentes WHERE id = $1', [id]);

    if (!rows[0]) return res.status(404).json({ error: 'Componente no encontrado' });

    const componente = {
      ...rows[0],
      edad_actual: calcularEdadActual(rows[0].fecha_instalacion),
      estado_revision: calcularEstadoRevision(rows[0])
    };

    res.json(componente);
  } catch (err) {
    console.error("Error al obtener componente:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔹 Crear componente
const crearComponente = async (req, res) => {
  try {
    if (!validarToken(req, res)) return;
    const { nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO componentes
       (nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url]
    );

    const componenteCreado = {
      ...rows[0],
      edad_actual: calcularEdadActual(rows[0].fecha_instalacion),
      estado_revision: calcularEstadoRevision(rows[0])
    };

    res.status(201).json(componenteCreado);
  } catch (err) {
    console.error("Error al crear componente:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔹 Actualizar componente
const actualizarComponente = async (req, res) => {
  try {
    if (!validarToken(req, res)) return;
    const { id } = req.params;
    const { nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url } = req.body;

    const { rows } = await pool.query(
      `UPDATE componentes
       SET nombre = $1, descripcion = $2, fabricante = $3, numero_serie = $4,
           ubicacion_id = $5, fecha_instalacion = $6, vida_util_meses = $7, estado = $8, imagen_url = $9
       WHERE id = $10 RETURNING *`,
      [nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url, id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Componente no encontrado' });

    const componenteActualizado = {
      ...rows[0],
      edad_actual: calcularEdadActual(rows[0].fecha_instalacion),
      estado_revision: calcularEstadoRevision(rows[0])
    };

    res.json(componenteActualizado);
  } catch (err) {
    console.error("Error al actualizar componente:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 🔹 Eliminar componente
const eliminarComponente = async (req, res) => {
  try {
    if (!validarToken(req, res)) return;
    const { id } = req.params;

    const { rowCount } = await pool.query('DELETE FROM componentes WHERE id = $1', [id]);

    if (rowCount === 0) return res.status(404).json({ error: 'Componente no encontrado' });

    res.json({ message: 'Componente eliminado correctamente' });
  } catch (err) {
    console.error("Error al eliminar componente:", err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerComponentes,
  obtenerComponenteById,
  crearComponente,
  actualizarComponente,
  eliminarComponente
};
