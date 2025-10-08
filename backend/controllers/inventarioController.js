const pool = require('../db');


//Controlador para obtener todo el inventario
const obtenerInventario = async (req, res) => {
  try {
    // Hacemos un JOIN con items para traer el nombre y descripción
    const query = `
      SELECT 
        i.id, 
        i.item_id, 
        i.cantidad, 
        i.costo_unitario, 
        i.ubicacion_actual, 
        i.fecha_actualizacion,
        it.nombre,
        it.descripcion,
        it.vida_util_meses
      FROM inventario i
      JOIN items it ON i.item_id = it.id
      ORDER BY i.item_id ASC
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay items en inventario' });
    }

    // Formatear la respuesta
    const inventario = result.rows.map(item => ({
      id: item.id,
      item_id: item.item_id,
      nombre: item.nombre || "Sin nombre",
      descripcion: item.descripcion || "",
      cantidad: parseInt(item.cantidad, 10),
      costo_unitario: parseFloat(item.costo_unitario).toFixed(2),
      ubicacion_actual: item.ubicacion_actual || null,
      fecha_actualizacion: item.fecha_actualizacion,
      vida_util_meses: item.vida_util_meses || null
    }));

    res.json(inventario);
  } catch (error) {
    console.error('❌ Error obteniendo inventario:', error.message);
    res.status(500).json({ error: 'Error obteniendo inventario' });
  }
};


//Controlador para actualizar inventario (sumar cantidad y recalcular costo promedio)
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
  actualizarInventario,
  obtenerInventario
};
