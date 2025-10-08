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

    // 1) Obtener componente que queremos dar de baja CON INFORMACIÓN COMPLETA DEL RESPONSABLE
    const { rows: compRows } = await client.query(
      `SELECT c.*, 
              resp.id AS responsable_id,
              resp.nombre AS responsable_nombre, 
              resp.apellido AS responsable_apellido
       FROM componentes c 
       LEFT JOIN usuarios resp ON c.responsable_mantenimiento = resp.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (compRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Componente no encontrado." });
    }
    const componente = compRows[0];

    console.log('🔍 DEBUG - Datos del componente:', {
      id: componente.id,
      nombre: componente.nombre,
      responsable_mantenimiento: componente.responsable_mantenimiento,
      responsable_id: componente.responsable_id,
      responsable_nombre: componente.responsable_nombre,
      responsable_apellido: componente.responsable_apellido
    });

    // 2) Determinar item_id para consultar inventario
    let itemId = componente.item_id;
    if (!itemId) {
      const { rows: itemRows } = await client.query(
        `SELECT id FROM items WHERE nombre = $1 LIMIT 1`,
        [componente.nombre]
      );
      if (itemRows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `❌ No se puede dar de baja: el componente "${componente.nombre}" no está asociado a un item conocido.`,
        });
      }
      itemId = itemRows[0].id;
    }

    // 3) Verificar disponibilidad en inventario
    const { rows: invRows } = await client.query(
      `SELECT * FROM inventario WHERE item_id = $1 AND cantidad > 0 LIMIT 1 FOR UPDATE`,
      [itemId]
    );
    if (invRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `❌ No se puede dar de baja el componente "${componente.nombre}" porque no hay disponibilidad en inventario (item_id=${itemId}).`,
      });
    }
    const inventarioItem = invRows[0];

    let nuevoComponente;
    
    // 4) SOLO CAMINO B: Crear nuevo componente desde inventario
    const numeroSerieFinal = serieNuevo || `${componente.numero_serie || 'R'}-REP-${Date.now()}`;

    // ✅ DEFINIR CLARAMENTE EL RESPONSABLE
    const responsableId = componente.responsable_mantenimiento || componente.responsable_id;
    
    console.log('🔍 DEBUG - Responsable a asignar:', {
      responsableId: responsableId,
      tieneValor: !!responsableId
    });

    // Crear nuevo componente con estado 'activo'
    const { rows: insertRows } = await client.query(
      `
      INSERT INTO componentes
      (nombre, descripcion, numero_serie, ubicacion_id, fecha_instalacion, 
       vida_util_meses, estado, responsable_mantenimiento, item_id)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'activo', $6, $7)
      RETURNING *
      `,
      [
        componente.nombre,
        componente.descripcion || null,
        numeroSerieFinal,
        componente.ubicacion_id,
        componente.vida_util_meses || null,
        responsableId, // ✅ Asignar el responsable
        itemId,
      ]
    );
    nuevoComponente = insertRows[0];

    console.log('🔍 DEBUG - Nuevo componente creado:', {
      id: nuevoComponente.id,
      responsable_asignado: nuevoComponente.responsable_mantenimiento
    });

    // Descontar 1 unidad del inventario
    await client.query(
      `UPDATE inventario SET cantidad = cantidad - 1, fecha_actualizacion = NOW() WHERE id = $1`,
      [inventarioItem.id]
    );

    // 5) MARCAR el componente viejo como 'baja' y cancelar mantenimientos pendientes
    await client.query(
      `
      UPDATE componentes
      SET estado = 'baja',
          fecha_ultima_revision = CURRENT_DATE
      WHERE id = $1
      `,
      [id]
    );

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

    // 6) Crear mantenimiento de reemplazo para el NUEVO componente
    const nuevoSerie = nuevoComponente.numero_serie || `ID-${nuevoComponente.id}`;
    const viejoSerie = componente.numero_serie || `ID-${componente.id}`;
    const nombreMant = `Mantenimiento preventivo ${nuevoSerie}`;
    const descripcion = `Mantenimiento programado para componente instalado reemplazando ${viejoSerie}`;
    
    // ✅ FECHA: Usar CURRENT_DATE (hoy) en lugar de fecha futura
    const fechaProgramada = 'CURRENT_DATE';
    
    // ✅ OPERARIO: Usar el mismo responsable que el componente
    const operario_id = responsableId;
    
    const ubicacion_id = componente.ubicacion_id;
    const comentarios = `Generado automáticamente al instalar nuevo componente ${nuevoSerie} reemplazando ${viejoSerie}.`;

    console.log('🔍 DEBUG - Creando mantenimiento:', {
      operario_id: operario_id,
      tieneOperario: !!operario_id,
      componente_id: nuevoComponente.id
    });

    // ✅ CORREGIDO: Insertar mantenimiento con operario_id explícito
    const { rows: mantRows } = await client.query(
      `
      INSERT INTO mantenimientos
      (nombre, descripcion, frecuencia, fecha_programada, estado, componente_id, operario_id, ubicacion_id, comentarios)
      VALUES ($1, $2, $3, ${fechaProgramada}, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        nombreMant,
        descripcion,
        frecuencia,
        "pendiente",
        nuevoComponente.id,
        operario_id, // ✅ Esto NO debe ser null
        ubicacion_id,
        comentarios,
      ]
    );
    const mantenimientoCreado = mantRows[0];

    console.log('🔍 DEBUG - Mantenimiento creado:', {
      id: mantenimientoCreado.id,
      operario_id: mantenimientoCreado.operario_id
    });

    await client.query("COMMIT");

    // 7) Traer info actualizada para devolver (detallada)
    const { rows: nuevoCompRows } = await pool.query(
      `SELECT c.*, u.nombre AS ubicacion_nombre, it.nombre AS item_nombre,
              usr.nombre AS responsable_nombre, usr.apellido AS responsable_apellido
       FROM componentes c
       LEFT JOIN ubicaciones u ON c.ubicacion_id = u.id
       LEFT JOIN items it ON c.item_id = it.id
       LEFT JOIN usuarios usr ON c.responsable_mantenimiento = usr.id
       WHERE c.id = $1`,
      [nuevoComponente.id]
    );

    const { rows: mantDet } = await pool.query(
      `SELECT m.*, 
              c.numero_serie AS componente_numero_serie,
              c.nombre AS componente_nombre,
              u.nombre AS ubicacion_nombre,
              o.nombre AS operario_nombre, o.apellido AS operario_apellido,
              o.id AS operario_id
       FROM mantenimientos m
       LEFT JOIN componentes c ON m.componente_id = c.id
       LEFT JOIN ubicaciones u ON m.ubicacion_id = u.id
       LEFT JOIN usuarios o ON m.operario_id = o.id
       WHERE m.id = $1`,
      [mantenimientoCreado.id]
    );

    console.log('🔍 DEBUG - Resultado final mantenimiento:', {
      operario_id: mantDet[0]?.operario_id,
      operario_nombre: mantDet[0]?.operario_nombre,
      operario_apellido: mantDet[0]?.operario_apellido
    });

    return res.json({
      message: "✅ Componente dado de baja y nuevo componente instalado correctamente.",
      componente_baja: {
        ...componente,
        estado: 'baja'
      },
      componente_nuevo: nuevoCompRows[0],
      mantenimiento: mantDet[0],
      inventario_actualizado: {
        item_id: itemId,
        cantidad_restante: inventarioItem.cantidad - 1
      },
      debug_info: {
        responsable_original: componente.responsable_mantenimiento,
        responsable_asignado: responsableId,
        operario_mantenimiento: operario_id,
        mantenimiento_operario: mantDet[0]?.operario_id
      }
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) { console.error("Rollback error:", e); }
    console.error("❌ Error al dar de baja componente:", err);
    
    if (err.code === "23505") {
      return res.status(400).json({ 
        error: "El número de serie proporcionado ya existe. Por favor, use uno diferente." 
      });
    }
    
    return res.status(500).json({ 
      error: "Error interno al dar de baja el componente.", 
      detalle: err.message 
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
