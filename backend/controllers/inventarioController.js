const pool = require('../db');

// 📦 Controlador para actualizar inventario (sumar cantidad y recalcular costo promedio)
const actualizarInventario = async (req, res) => {
  const { item_id } = req.params;
  let { cantidad, costo_unitario, ubicacion_actual } = req.body;

  try {
    // Convertir a número y validar
    cantidad = parseInt(cantidad, 10);
    costo_unitario = parseFloat(costo_unitario);

    if (isNaN(cantidad) || isNaN(costo_unitario)) {
      return res.status(400).json({ error: 'Cantidad y costo_unitario deben ser numéricos' });
    }

    // 1. Obtener el registro actual
    const result = await pool.query(
      'SELECT * FROM inventario WHERE item_id = $1',
      [item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado en inventario' });
    }

    const inventario = result.rows[0];
    const cantidadActual = parseInt(inventario.cantidad, 10);
    const costoActual = parseFloat(inventario.costo_unitario);

    // 2. Calcular nuevo total y costo promedio
    const nuevaCantidad = cantidadActual + cantidad;

    let nuevoCosto = costoActual;
    if (nuevaCantidad > 0) {
      nuevoCosto =
        (cantidadActual * costoActual + cantidad * costo_unitario) /
        nuevaCantidad;
    } else {
      nuevoCosto = 0; // Si no queda stock, el costo promedio se resetea
    }

    // 3. Actualizar en DB
    const update = await pool.query(
      `UPDATE inventario
       SET cantidad = $1,
           costo_unitario = $2,
           ubicacion_actual = $3,
           fecha_actualizacion = NOW()
       WHERE item_id = $4
       RETURNING *`,
      [nuevaCantidad, nuevoCosto.toFixed(2), ubicacion_actual || inventario.ubicacion_actual, item_id]
    );

    if (update.rows.length === 0) {
      return res.status(404).json({ error: 'No se pudo actualizar el inventario' });
    }

    // 4. Responder con valores numéricos y costo en formato COP
    const actualizado = update.rows[0];
    res.json({
      ...actualizado,
      cantidad: parseInt(actualizado.cantidad, 10),
      costo_unitario: parseFloat(actualizado.costo_unitario).toFixed(2) // siempre 2 decimales
    });

  } catch (error) {
    console.error('❌ Error actualizando inventario:', error.message);
    res.status(500).json({ error: 'Error actualizando inventario' });
  }
};

module.exports = {
  actualizarInventario
};
