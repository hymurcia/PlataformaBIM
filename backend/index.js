const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { generateToken, verifyToken } = require("./utils/jwt");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const { setSocket } = require("./utils/notificar");
const rateLimit = require("express-rate-limit");

const app = express();
const server = http.createServer(app); // Necesario para Socket.IO

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "https://plataformabim.onrender.com",
  "https://plataformabim-1.onrender.com"
];

const io = socketIO(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// =========================
// Rate Limiting
// =========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: { error: "Demasiadas solicitudes, intenta de nuevo en 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

// =========================
// Middlewares
// =========================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({ 
    origin: ALLOWED_ORIGINS,
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

// ¡SOLO UNA VEZ! Esto asegura que el cuerpo JSON se parsea correctamente.
app.use(express.json());

// Aplicar rate limiting global
app.use(limiter);

// Middleware para establecer UTF-8 en todas las respuestas
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
const logsRoutes = require("./routes/logs");

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
app.use("/logs", logsRoutes);

// =========================
// Socket.IO para notificaciones
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

// 🔹 Inyectar socket en el módulo de notificaciones
setSocket(io);

// Exportar io por si lo necesitas en otro lugar
app.set("io", io);

// =========================
// Start
// =========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
