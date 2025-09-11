const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const { generateToken, verifyToken } = require('./utils/jwt');
const path = require('path');
const app = express();
const saltRounds = 10;

// Middlewares
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
// Middleware para establecer UTF-8 en todas las respuestas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});


// Importar rutas
const authRoutes = require('./routes/auth');
const perfilRoutes = require('./routes/perfil');
const ubicacionesRoutes = require('./routes/ubicaciones');
const incidentesRoutes = require('./routes/incidentes');
const reporteRoutes = require('./routes/reporte');
const asignacionesRoutes = require('./routes/asignaciones');
const metricasRoutes = require('./routes/metricas');
const adminUsuariosRoutes = require('./routes/adminUsuarios');
const mantenimientosRoutes = require('./routes/mantenimientos');
const solicitudRoutes = require("./routes/solicitudes");
const climaRoutes = require('./routes/clima');
const componentesRoutes = require('./routes/componentes');
const predictivoRoutes = require('./routes/predictivo');
const inventarioRoutes = require('./routes/inventario');
const itemRoutes = require('./routes/item');
const informesRoutes = require('./routes/informes');
// Usar rutas
app.use('/auth', authRoutes);
app.use('/perfil', perfilRoutes);
app.use('/ubicaciones', ubicacionesRoutes);
app.use('/incidentes', incidentesRoutes);
app.use('/reportes', reporteRoutes);
app.use('/asignaciones', asignacionesRoutes);
app.use('/metricas', metricasRoutes);
app.use('/admin', adminUsuariosRoutes);
app.use('/solicitudes', solicitudRoutes);
app.use('/mantenimientos', mantenimientosRoutes);
app.use('/clima', climaRoutes);
app.use('/componentes', componentesRoutes);
app.use('/predictivo', predictivoRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/items', itemRoutes);
app.use('/informes', informesRoutes);

// =========================
// Start
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
