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
  return 'activo';
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

const crearComponente = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!validarToken(req, res)) return;

    const {
      nombre,
      descripcion,
      numero_serie,
      ubicacion_id,
      fecha_instalacion,
      vida_util_meses,
      estado,
      imagen_url,
      responsable_mantenimiento
    } = req.body;

    if (!nombre || !numero_serie || !ubicacion_id) {
      client.release();
      return res.status(400).json({
        error: "Faltan datos obligatorios del componente (nombre, número de serie o ubicación)."
      });
    }

    // 🔁 Iniciar transacción
    await client.query("BEGIN");

    // 🔍 Verificar duplicado
    const { rows: duplicado } = await client.query(
      "SELECT id FROM componentes WHERE numero_serie = $1",
      [numero_serie]
    );
    if (duplicado.length > 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        error: `⚠️ Ya existe un componente con el número de serie "${numero_serie}".`
      });
    }

    // 🔍 Buscar item_id correspondiente al nombre del componente
    const { rows: item } = await client.query(
      "SELECT id FROM items WHERE nombre = $1",
      [nombre]
    );

    if (item.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        error: `🚫 No se encontró ningún ítem llamado "${nombre}" en la tabla de items.`
      });
    }

    const item_id = item[0].id;

    // 🧾 Insertar componente
    const { rows } = await client.query(
      `
      INSERT INTO componentes
      (nombre, descripcion, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado, imagen_url, responsable_mantenimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        nombre,
        descripcion || "",
        numero_serie,
        ubicacion_id,
        fecha_instalacion || new Date(),
        vida_util_meses || 12,
        estado || "activo",
        imagen_url || null,
        responsable_mantenimiento || null
      ]
    );

    // 🧮 Restar cantidad del inventario
    const updateResult = await client.query(
      `
      UPDATE inventario
      SET cantidad = cantidad - 1,
          fecha_actualizacion = NOW()
      WHERE item_id = $1 AND cantidad > 0
      RETURNING *;
      `,
      [item_id]
    );

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        error: `🚫 No hay unidades disponibles de "${nombre}" en el inventario o ya está agotado.`
      });
    }

    // ✅ Confirmar transacción
    await client.query("COMMIT");
    client.release();

    const componenteCreado = {
      ...rows[0],
      edad_actual: calcularEdadActual(rows[0].fecha_instalacion),
      estado_revision: calcularEstadoRevision(rows[0])
    };

    return res.status(201).json({
      message: "✅ Componente creado exitosamente y actualizado el inventario.",
      componente: componenteCreado
    });

  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ Error al crear componente:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        error: `⚠️ Ya existe un componente con el número de serie "${req.body.numero_serie}".`
      });
    }

    return res.status(500).json({
      error: "❌ Error interno del servidor al crear el componente.",
      detalle: err.message
    });
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


// 🧰 Dar de baja un componente
const darDeBajaComponente = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { frecuencia: frecuenciaBody, numero_serie: serieNuevo } = req.body || {};
    const frecuencia = frecuenciaBody || "semestral";

    // 1️⃣ Validar existencia del componente
    const { rows: compRows } = await client.query(
      `SELECT * FROM componentes WHERE id = $1`,
      [id]
    );

    if (compRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Componente no encontrado" });
    }

    const componente = compRows[0];

    // 2️⃣ Marcar componente viejo como dado de baja
    await client.query(
      `
      UPDATE componentes
      SET estado = 'baja',
          fecha_ultima_revision = CURRENT_DATE
      WHERE id = $1
      `,
      [id]
    );

    // 3️⃣ Cancelar mantenimientos pendientes/no completados asociados
    await client.query(
      `
      UPDATE mantenimientos
      SET estado = 'cancelado',
          comentarios = COALESCE(comentarios, '') || ' - Cancelado: componente dado de baja.'
      WHERE componente_id = $1
        AND estado != 'completado'
      `,
      [id]
    );

    // 4️⃣ Buscar repuesto disponible (por item_id o nombre)
    let repuestoRes;
    if (componente.item_id) {
      repuestoRes = await client.query(
        `
        SELECT id, nombre, numero_serie, ubicacion_id, responsable_mantenimiento
        FROM componentes
        WHERE item_id = $1
          AND estado = 'operativo'
          AND id != $2
        ORDER BY fecha_creacion ASC
        LIMIT 1
        `,
        [componente.item_id, id]
      );
    } else {
      repuestoRes = await client.query(
        `
        SELECT id, nombre, numero_serie, ubicacion_id, responsable_mantenimiento
        FROM componentes
        WHERE nombre = $1
          AND estado = 'operativo'
          AND id != $2
        ORDER BY fecha_creacion ASC
        LIMIT 1
        `,
        [componente.nombre, id]
      );
    }

    // 5️⃣ Si no hay repuesto disponible, salir
    if (repuestoRes.rows.length === 0) {
      await client.query("COMMIT");
      return res.json({
        message: "Componente dado de baja correctamente, pero no hay repuesto disponible en inventario.",
        componente_baja: componente,
      });
    }

    const nuevoComponente = repuestoRes.rows[0];

    // 6️⃣ Actualizar el nuevo componente con los datos del viejo
    await client.query(
      `
      UPDATE componentes
      SET ubicacion_id = $1,
          responsable_mantenimiento = $2,
          fecha_instalacion = CURRENT_DATE,
          fecha_ultima_revision = CURRENT_DATE,
          estado = 'progreso'
      WHERE id = $3
      `,
      [componente.ubicacion_id, componente.responsable_mantenimiento, nuevoComponente.id]
    );

    // 7️⃣ Crear el mantenimiento de reemplazo con todos los detalles
    const nuevoSerie = serieNuevo || nuevoComponente.numero_serie || `ID-${nuevoComponente.id}`;
    const viejoSerie = componente.numero_serie || `ID-${componente.id}`;

    const nombreMant = `Mantenimiento de reemplazo ${nuevoSerie}`;
    const descripcion = `Cambio de componente: se reemplaza el componente ${viejoSerie} por ${nuevoSerie}`;
    const operario_id = componente.responsable_mantenimiento || (req.user && req.user.id) || null;
    const ubicacion_id = componente.ubicacion_id || nuevoComponente.ubicacion_id || null;
    const comentarios = `Generado automáticamente al dar de baja el componente ${viejoSerie}.`;

    const insertMantRes = await client.query(
      `
      INSERT INTO mantenimientos
      (nombre, descripcion, frecuencia, fecha_programada, estado, componente_id, operario_id, ubicacion_id, comentarios)
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        nombreMant,
        descripcion,
        frecuencia,
        "progreso", // 🔥 Estado cambiado a "progreso"
        nuevoComponente.id,
        operario_id,
        ubicacion_id,
        comentarios,
      ]
    );

    const mantenimientoCreado = insertMantRes.rows[0];

    await client.query("COMMIT");

    // 8️⃣ Traer el nuevo componente actualizado
    const { rows: nuevoCompRows } = await pool.query(
      `SELECT * FROM componentes WHERE id = $1`,
      [nuevoComponente.id]
    );

    return res.json({
      message: "✅ Componente dado de baja y reemplazo asignado correctamente.",
      componente_baja: componente,
      componente_nuevo: nuevoCompRows[0],
      mantenimiento: mantenimientoCreado,
    });

  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Error al hacer rollback:", rollbackErr);
    }

    console.error("❌ Error al dar de baja componente:", err);
    return res.status(500).json({
      error: "Error interno del servidor al dar de baja el componente.",
      detalle: err.message,
    });
  } finally {
    client.release();
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
  darDeBajaComponente,
  eliminarComponente
};
