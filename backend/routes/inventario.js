const express = require('express');
const router = express.Router();
const pool = require('../db');
const upload = require('../middleware/upload');

// 1. Obtener todos los items con su inventario
router.get('/items', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        i.*,
        c.nombre as categoria,
        inv.cantidad,
        inv.costo_unitario,
        inv.ubicacion_actual
      FROM items i
      LEFT JOIN categorias_items c ON i.categoria_id = c.id
      LEFT JOIN (
        SELECT item_id, SUM(cantidad) as cantidad, 
               AVG(costo_unitario) as costo_unitario,
               MAX(ubicacion_actual) as ubicacion_actual
        FROM inventario
        GROUP BY item_id
      ) inv ON i.id = inv.item_id
      ORDER BY i.nombre
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener items' });
  }
});

// 2. Crear nuevo item con imagen
router.post('/items', upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, descripcion, categoria_id, ubicacion_default } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO items 
       (nombre, descripcion, categoria_id, imagen_url, ubicacion_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, categoria_id, imagen_url, ubicacion_default]
    );

    // Crear registro inicial en inventario
    await pool.query(
      `INSERT INTO inventario 
       (item_id, cantidad, costo_unitario, ubicacion_actual)
       VALUES ($1, 0, 0, $2)`,
      [rows[0].id, ubicacion_default]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear item' });
  }
});

// 3. Actualizar inventario de un item
router.put('/inventario/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { cantidad, costo_unitario, ubicacion_actual } = req.body;

    const { rows } = await pool.query(
      `UPDATE inventario 
       SET 
         cantidad = $1,
         costo_unitario = $2,
         ubicacion_actual = $3
       WHERE item_id = $4
       RETURNING *`,
      [cantidad, costo_unitario, ubicacion_actual, item_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al actualizar inventario' });
  }
});

// 4. Obtener todos los componentes
router.get('/componentes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *,
        (fecha_instalacion + (vida_util_meses * INTERVAL '1 month')) as fecha_caducidad
      FROM componentes
      ORDER BY nombre
    `);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener componentes' });
  }
});

// 5. Crear nuevo componente
router.post('/componentes', upload.single('imagen'), async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      fabricante, 
      numero_serie, 
      ubicacion, 
      fecha_instalacion, 
      vida_util_meses 
    } = req.body;
    
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO componentes 
       (nombre, descripcion, fabricante, numero_serie, ubicacion, 
        fecha_instalacion, vida_util_meses, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        nombre, 
        descripcion, 
        fabricante, 
        numero_serie, 
        ubicacion, 
        fecha_instalacion, 
        vida_util_meses, 
        imagen_url
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear componente' });
  }
});

// 6. Asignar items a un componente
router.post('/componentes/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { item_id, cantidad } = req.body;

    // Verificar que el item existe en inventario
    const inventario = await pool.query(
      'SELECT cantidad FROM inventario WHERE item_id = $1',
      [item_id]
    );

    if (inventario.rows.length === 0) {
      return res.status(400).json({ error: 'Item no existe en inventario' });
    }

    if (inventario.rows[0].cantidad < cantidad) {
      return res.status(400).json({ error: 'Cantidad insuficiente en inventario' });
    }

    const { rows } = await pool.query(
      `INSERT INTO componente_items 
       (componente_id, item_id, cantidad)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, item_id, cantidad]
    );

    // Actualizar inventario (restar cantidad)
    await pool.query(
      'UPDATE inventario SET cantidad = cantidad - $1 WHERE item_id = $2',
      [cantidad, item_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al asignar items' });
  }
});

module.exports = router;