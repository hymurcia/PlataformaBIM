const pool = require('../db');
const { verifyToken } = require('../utils/jwt');

// Listar todos los componentes
const getComponentes = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        verifyToken(token); // si es inválido lanza error

        const { rows } = await pool.query('SELECT * FROM componentes ORDER BY id');
        res.json(rows);
    } catch (err) {
        console.error(err.message);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Obtener componente por ID
const getComponenteById = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        verifyToken(token);

        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM componentes WHERE id = $1', [id]);

        if (!rows[0]) return res.status(404).json({ error: 'Componente no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Crear componente
const createComponente = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        verifyToken(token);

        const { nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado } = req.body;

        const { rows } = await pool.query(
            `INSERT INTO componentes
            (nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [nombre, descripcion, fabricante, numero_serie, ubicacion_id, fecha_instalacion, vida_util_meses, estado]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = { getComponentes, getComponenteById, createComponente };
