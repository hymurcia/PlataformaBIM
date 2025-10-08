const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");
const { generateToken, verifyToken } = require("./utils/jwt");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const { setSocket } = require("./utils/notificar");

// Inicialización de Express y servidor HTTP
const app = express();
const server = http.createServer(app);

// =========================
// Socket.IO (Notificaciones en tiempo real)
// =========================
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000", // URL del frontend React
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// =========================
// Middlewares
// =========================
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Archivos estáticos (uploads y pdfs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

// Establecer codificación UTF-8 para todas las respuestas JSON
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// =========================
// Importar rutas
// =========================
const authRoutes = require("./routes/auth");
const perfilRoutes = require("./routes/perfil");
const ubicacionesRoutes = require("./routes/ubicaciones");
const incidentesRoutes = require("./routes/incidentes");
const reporteRoutes = require("./routes/reporte");
const asignacionesRoutes = require("./routes/asignaciones");
const metricasRoutes = require("./routes/metricas");
const adminUsuariosRoutes = require("./routes/adminUsuarios");
const mantenimientosRoutes = require("./routes/mantenimientos");
const solicitudRoutes = require("./routes/solicitudes");
const climaRoutes = require("./routes/clima");
const componentesRoutes = require("./routes/componentes");
const predictivoRoutes = require("./routes/predictivo");
const inventarioRoutes = require("./routes/inventario");
const itemRoutes = require("./routes/item");
const informesRoutes = require("./routes/informes");
const notificacionesRoutes = require("./routes/notificaciones");

// =========================
// Usar rutas
// =========================
app.use("/auth", authRoutes);
app.use("/perfil", perfilRoutes);
app.use("/ubicaciones", ubicacionesRoutes);
app.use("/incidentes", incidentesRoutes);
app.use("/reportes", reporteRoutes);
app.use("/asignaciones", asignacionesRoutes);
app.use("/metricas", metricasRoutes);
app.use("/admin", adminUsuariosRoutes);
app.use("/solicitudes", solicitudRoutes);
app.use("/mantenimientos", mantenimientosRoutes);
app.use("/clima", climaRoutes);
app.use("/componentes", componentesRoutes);
app.use("/predictivo", predictivoRoutes);
app.use("/inventario", inventarioRoutes);
app.use("/items", itemRoutes);
app.use("/informes", informesRoutes);
app.use("/notificaciones", notificacionesRoutes);

// =========================
// Socket.IO - Conexiones de usuarios
// =========================
io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  // Cada usuario se une a su propia sala
  socket.on("join", (usuario_id) => {
    socket.join(`usuario_${usuario_id}`);
    console.log(`✅ Usuario ${usuario_id} se unió a su sala personal`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
});

// Inyectar Socket.IO al módulo de notificaciones
setSocket(io);

// Hacer disponible el socket globalmente si se necesita
app.set("io", io);

// =========================
// Servidor en marcha
// =========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
