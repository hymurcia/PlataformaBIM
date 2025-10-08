const pool = require("../db");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { notificar } = require("../utils/notificar");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 🧾 Crear una nueva solicitud
const crearSolicitud = async (req, res) => {
  try {
    const { item_solicitado, cantidad, justificacion } = req.body;

    if (!req.user || (!req.user.id && !req.user.nombre && !req.user.usuario)) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // 🧠 Datos del usuario solicitante
    const usuarioId = req.user.id;
    const usuarioNombre =
      req.user.nombre || req.user.usuario || "Usuario desconocido";
    const rolUsuario = "Operativo"; // Puedes ajustar si el JWT trae rol

    // 📝 Crear la solicitud
    const nuevaSolicitud = await pool.query(
      `INSERT INTO solicitudadquisicion 
        (usuario_solicitante, item_solicitado, cantidad, justificacion, estado_solicitud, fecha_solicitud)
       VALUES ($1, $2, $3, $4, 'pendiente', NOW())
       RETURNING *`,
      [usuarioNombre, item_solicitado, cantidad || 1, justificacion || ""]
    );

    const solicitud = nuevaSolicitud.rows[0];

    // 🔔 Notificar a todos los administrativos (rol_id = 2)
    const admins = await pool.query(`SELECT id FROM usuarios WHERE rol_id = 2`);
    for (const admin of admins.rows) {
      await notificar({
        usuario_id: admin.id,
        titulo: "Nueva solicitud de adquisición",
        mensaje: `El ${rolUsuario} ${usuarioNombre} ha generado una nueva solicitud para "${item_solicitado}".`,
        tipo: "alerta",
        link: `${FRONTEND_URL}/Gsolicitudes`,
      });
    }

    res.status(201).json({
      message: "Solicitud creada correctamente y notificación enviada a administrativos.",
      solicitud,
    });
  } catch (err) {
    console.error("❌ Error al crear solicitud:", err);
    res.status(500).json({ error: "Error interno al crear solicitud" });
  }
};

// 📋 Obtener todas las solicitudes
const obtenerSolicitudes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM solicitudadquisicion ORDER BY fecha_solicitud DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener solicitudes:", error);
    res.status(500).json({ error: "Error interno al obtener solicitudes" });
  }
};

// ✅ Aprobar solicitud (genera PDF profesional)
const aprobarSolicitud = async (req, res) => {
  const { id } = req.params;
  const aprobador = req.user.nombre || req.user.usuario || "Administrador";

  try {
    const result = await pool.query(
      "SELECT * FROM solicitudadquisicion WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Solicitud no encontrada" });

    const solicitud = result.rows[0];

    const update = await pool.query(
      `UPDATE solicitudadquisicion
       SET estado_solicitud = 'aprobada', id_usuario_aprueba = $1, fecha_aprobacion = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    );

    const solicitudActualizada = update.rows[0];

    // 3️⃣ Generar PDF profesional
    const pdfPath = path.join(__dirname, `../pdfs/solicitud_${id}.pdf`);
    await generarPDFProfesional(solicitudActualizada, aprobador, pdfPath);

    res.json({
      message: "Solicitud aprobada y PDF generado correctamente",
      pdfUrl: `/pdfs/solicitud_${id}.pdf`,
    });
  } catch (err) {
    console.error("❌ Error al aprobar solicitud:", err);
    res.status(500).json({ error: "Error al aprobar solicitud" });
  }
};

// 🔁 Regenerar PDF
const regenerarPDF = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM solicitudadquisicion WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Solicitud no encontrada" });

    const solicitud = result.rows[0];
    const aprobador = req.user.nombre || req.user.usuario || "Administrador";

    const pdfPath = path.join(
      __dirname,
      `../pdfs/solicitud_${id}_regenerada.pdf`
    );
    await generarPDFProfesional(solicitud, aprobador, pdfPath);

    res.json({
      message: "PDF regenerado exitosamente",
      pdfUrl: `/pdfs/solicitud_${id}_regenerada.pdf`,
    });
  } catch (err) {
    console.error("❌ Error al regenerar PDF:", err);
    res.status(500).json({ error: "Error al regenerar PDF" });
  }
};

// 🎨 Generador de PDF con formato profesional
const generarPDFProfesional = (solicitud, aprobador, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    // Crear carpeta si no existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // --- Encabezado con logo ---
    const logoPath = path.join(__dirname, "../assets/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 80 });
    }

    doc
      .fontSize(20)
      .text("PLATAFORMA BIM", 150, 50, { align: "center", bold: true })
      .moveDown(2);

    doc
      .fontSize(16)
      .fillColor("#003366")
      .text("SOLICITUD DE ADQUISICIÓN", { align: "center", underline: true })
      .moveDown(1);

    // Línea separadora
    doc.moveTo(50, 150).lineTo(550, 150).stroke("#003366").moveDown(2);

    // Información principal
    doc
      .fontSize(12)
      .fillColor("black")
      .text(`📄 ID Solicitud: ${solicitud.id}`)
      .text(`👤 Solicitante: ${solicitud.usuario_solicitante}`)
      .text(`📦 Ítem solicitado: ${solicitud.item_solicitado}`)
      .text(`🔢 Cantidad: ${solicitud.cantidad}`)
      .text(
        `🗓 Fecha de solicitud: ${new Date(
          solicitud.fecha_solicitud
        ).toLocaleString()}`
      )
      .text(`✅ Estado actual: ${solicitud.estado_solicitud}`)
      .moveDown(1);

    // Justificación
    doc
      .fontSize(12)
      .fillColor("#003366")
      .text("Justificación:", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(solicitud.justificacion || "No especificada", {
        align: "justify",
      })
      .moveDown(1.5);

    // Aprobación
    doc
      .fontSize(12)
      .fillColor("#003366")
      .text("Aprobación:", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Aprobado por: ${aprobador}`)
      .text(`Fecha de aprobación: ${new Date().toLocaleString()}`)
      .moveDown(3);

    // Firma
    doc
      .moveDown(3)
      .fontSize(10)
      .text("---------------------------", { align: "center" })
      .text(`${aprobador}`, { align: "center" })
      .text("Firma del aprobador", { align: "center" });

    // Pie de página
    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("gray")
      .text("Generado automáticamente por la Plataforma BIM", {
        align: "center",
      });

    doc.end();

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
};

module.exports = {
  crearSolicitud,
  obtenerSolicitudes,
  aprobarSolicitud,
  regenerarPDF,
};
