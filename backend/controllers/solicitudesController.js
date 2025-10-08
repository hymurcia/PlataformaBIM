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

// 🎨 Generador de PDF con formato profesional - UNA SOLA PÁGINA
const generarPDFProfesional = (solicitud, aprobador, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: false // IMPORTANTE: Evitar múltiples páginas
    });

    // Crear carpeta si no existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // --- ENCABEZADO ---
    // Logo (si existe)
    const logoPath = path.join(__dirname, "../assets/logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 60 });
    }

    // Título principal centrado
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#003366')
      .text("PLATAFORMA BIM", 50, 50, { width: 500, align: "center" });

    // Subtítulo
    doc
      .fontSize(14)
      .text("SOLICITUD DE ADQUISICIÓN", 50, 80, { 
        width: 500,
        align: "center",
        underline: true 
      });

    // Línea separadora
    doc
      .moveTo(50, 120)
      .lineTo(545, 120)
      .lineWidth(2)
      .strokeColor('#003366')
      .stroke();

    // --- INFORMACIÓN DE LA SOLICITUD ---
    let yPosition = 150;

    // Función para agregar campo de información
    const agregarCampo = (etiqueta, valor, y) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#333333')
        .text(etiqueta, 50, y);
      
      doc
        .font('Helvetica')
        .text(valor.toString(), 180, y);
      
      return y + 20;
    };

    // Campos de información
    yPosition = agregarCampo('ID Solicitud:', solicitud.id.toString(), yPosition);
    yPosition = agregarCampo('Solicitante:', solicitud.usuario_solicitante, yPosition);
    yPosition = agregarCampo('Item solicitado:', solicitud.item_solicitado, yPosition);
    yPosition = agregarCampo('Cantidad:', solicitud.cantidad.toString(), yPosition);
    
    // Formatear fecha correctamente
    const fechaSolicitud = new Date(solicitud.fecha_solicitud);
    const fechaFormateada = fechaSolicitud.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    yPosition = agregarCampo('Fecha de solicitud:', fechaFormateada, yPosition);
    yPosition = agregarCampo('Estado actual:', solicitud.estado_solicitud, yPosition);

    // --- JUSTIFICACIÓN ---
    yPosition += 30;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#003366')
      .text('Justificación:', 50, yPosition);

    // Rectángulo de fondo para justificación (más compacto)
    const alturaJustificacion = 40; // Más compacto
    doc
      .rect(50, yPosition + 15, 495, alturaJustificacion)
      .fillColor('#f8f9fa')
      .fill()
      .strokeColor('#dee2e6')
      .stroke();

    // Texto de justificación
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#333333')
      .text(solicitud.justificacion || 'No especificada', 55, yPosition + 20, {
        width: 485,
        align: 'justify'
      });

    // --- APROBACIÓN ---
    yPosition += alturaJustificacion + 50;

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#003366')
      .text('Aprobación:', 50, yPosition);

    // Información de aprobación
    yPosition += 20;
    
    // Usar fecha de aprobación de la solicitud si existe, sino fecha actual
    const fechaAprobacion = solicitud.fecha_aprobacion 
      ? new Date(solicitud.fecha_aprobacion).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

    yPosition = agregarCampo('Aprobado por:', aprobador, yPosition);
    yPosition = agregarCampo('Fecha de aprobación:', fechaAprobacion, yPosition);

    // --- FIRMA ---
    yPosition += 40;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#666666')
      .text('_________________________', 50, yPosition)
      .text(aprobador, 50, yPosition + 15)
      .text('Firma del aprobador', 50, yPosition + 30);

    // --- PIE DE PÁGINA ---
    // Calcular posición fija para el pie de página (parte inferior)
    const pageHeight = 842; // Altura de página A4 en puntos
    const pieYPosition = pageHeight - 80; // Posición fija cerca del fondo
    
    // Línea separadora del pie de página
    doc
      .moveTo(50, pieYPosition - 10)
      .lineTo(545, pieYPosition - 10)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();

    // Texto del pie de página
    doc
      .fontSize(9)
      .fillColor('#999999')
      .text(
        'Generado automáticamente por la Plataforma BIM', 
        50, 
        pieYPosition, 
        { width: 500, align: "center" }
      );

    // Número de página - SOLO UNA
    doc
      .text('Página 1 de 1', 50, pieYPosition + 15, { width: 500, align: "center" });

    // FINALIZAR DOCUMENTO
    doc.end();

    stream.on("finish", () => {
      console.log(`✅ PDF generado correctamente en una sola página: ${outputPath}`);
      resolve(outputPath);
    });
    
    stream.on("error", (error) => {
      console.error('❌ Error al generar PDF:', error);
      reject(error);
    });
  });
};


module.exports = {
  crearSolicitud,
  obtenerSolicitudes,
  aprobarSolicitud,
  regenerarPDF,
};
