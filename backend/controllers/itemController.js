const pool = require("../db");

// ===================================================
// 1. Obtener todos los items con su inventario
// ===================================================
const obtenerItems = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        i.*,
        c.nombre AS categoria,
        inv.id AS inventario_id,
        inv.cantidad,
        inv.costo_unitario,
        inv.ubicacion_actual,
        inv.fecha_actualizacion
      FROM items i
      LEFT JOIN categorias_items c ON i.categoria_id = c.id
      LEFT JOIN inventario inv ON i.id = inv.item_id
      ORDER BY i.nombre
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error en obtenerItems:", err.message);
    res.status(500).json({ error: "Error al obtener items" });
  }
};

// ===================================================
// 2. Crear nuevo item con registro inicial en inventario
// ===================================================
const crearItem = async (req, res) => {
  try {
    const { nombre, descripcion, categoria_id, ubicacion_default, vida_util_meses } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Crear item
    const { rows } = await pool.query(
      `INSERT INTO items 
       (nombre, descripcion, categoria_id, imagen_url, ubicacion_default, fecha_creacion, vida_util_meses)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING *`,
      [nombre, descripcion, categoria_id || null, imagen_url, ubicacion_default, vida_util_meses]
    );

    const nuevoItem = rows[0];

    // Crear registro inicial en inventario
    await pool.query(
      `INSERT INTO inventario 
       (item_id, cantidad, costo_unitario, ubicacion_actual, fecha_actualizacion)
       VALUES ($1, 0, 0, $2, NOW())`,
      [nuevoItem.id, ubicacion_default]
    );

    res.status(201).json(nuevoItem);
  } catch (err) {
    console.error("❌ Error en crearItem:", err.message);
    res.status(500).json({ error: "Error al crear item" });
  }
};

// ===================================================
// 3. Actualizar un item
// ===================================================
const actualizarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria_id, ubicacion_default, vida_util_meses } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `UPDATE items
       SET nombre = $1,
           descripcion = $2,
           categoria_id = $3,
           imagen_url = COALESCE($4, imagen_url),
           ubicacion_default = $5,
           vida_util_meses = $6
       WHERE id = $7
       RETURNING *`,
      [nombre, descripcion, categoria_id || null, imagen_url, ubicacion_default, vida_util_meses, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Item no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error en actualizarItem:", err.message);
    res.status(500).json({ error: "Error al actualizar item" });
  }
};

// ===================================================
// 4. Eliminar un item (inventario se elimina en cascada)
// ===================================================
const eliminarItem = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query("DELETE FROM items WHERE id = $1", [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Item no encontrado" });
    }

    res.json({ mensaje: "✅ Item eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en eliminarItem:", err.message);
    res.status(500).json({ error: "Error al eliminar item" });
  }
};

// ===================================================
// 5. Actualizar inventario de un item con promedio ponderado
// ===================================================
const actualizarInventario = async (req, res) => {
  try {
    const { item_id } = req.params;
    const { cantidad, costo_unitario, ubicacion_actual } = req.body;

    const inventarioActual = await pool.query(
      "SELECT cantidad, costo_unitario FROM inventario WHERE item_id = $1",
      [item_id]
    );

    if (inventarioActual.rows.length === 0) {
      return res.status(404).json({ error: "El item no existe en inventario" });
    }

    const { cantidad: cantidad_actual, costo_unitario: costo_actual } =
      inventarioActual.rows[0];

    const nuevaCantidad = parseInt(cantidad_actual) + parseInt(cantidad);

    if (nuevaCantidad < 0) {
      return res.status(400).json({ error: "❌ No hay suficiente inventario disponible" });
    }

    // Calcular promedio ponderado
    const nuevoCostoUnitario =
      nuevaCantidad === 0
        ? 0
        : ((cantidad_actual * costo_actual) + (cantidad * costo_unitario)) / nuevaCantidad;

    const { rows } = await pool.query(
      `UPDATE inventario 
       SET cantidad = $1,
           costo_unitario = $2,
           ubicacion_actual = $3,
           fecha_actualizacion = NOW()
       WHERE item_id = $4
       RETURNING *`,
      [nuevaCantidad, nuevoCostoUnitario, ubicacion_actual, item_id]
    );

    res.json({
      mensaje: "✅ Inventario actualizado con promedio ponderado",
      inventario: rows[0],
    });
  } catch (err) {
    console.error("❌ Error en actualizarInventario:", err.message);
    res.status(500).json({ error: "Error al actualizar inventario" });
  }
};

module.exports = {
  obtenerItems,
  crearItem,
  actualizarItem,
  eliminarItem,
  actualizarInventario,
};
