const pool = require("../db");
const PDFDocument = require("pdfkit");
const path = require("path");

// Obtener auditoría en JSON (para el frontend)
const obtenerAuditoria = async (req, res) => {
    try {
        const inventario = await pool.query(`
            SELECT i.id, it.nombre, i.cantidad, i.costo_unitario, i.ubicacion_actual
            FROM inventario i
            JOIN items it ON i.item_id = it.id
            ORDER BY it.nombre;
        `);

        const mantenimientos = await pool.query(`
            SELECT m.id, m.nombre, m.estado, m.fecha_programada, u.nombre as responsable
            FROM mantenimientos m
            JOIN usuarios u ON m.operario_id = u.id
            ORDER BY m.fecha_programada DESC;
        `);

        const incidentes = await pool.query(`
            SELECT i.id, i.descripcion, i.estado, i.fecha_creacion
            FROM incidente i
            ORDER BY i.fecha_creacion DESC;
        `);

        const usuarios = await pool.query(`
            SELECT u.id, u.nombre, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            ORDER BY u.nombre;
        `);

        res.json({
            inventario: inventario.rows,
            mantenimientos: mantenimientos.rows,
            incidentes: incidentes.rows,
            usuarios: usuarios.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener auditoría" });
    }
};

// Generar PDF profesional con logo, portada y secciones
const generarPDF = async (req, res) => {
    try {
        const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=auditoria.pdf");
        doc.pipe(res);

        // ================= PORTADA =================
        const logoPath = path.join(__dirname, "../assets/logoU.png");
        try {
            const logoWidth = 120;
            const logoY = doc.page.height / 3 - 60;
            doc.image(logoPath, (doc.page.width - logoWidth) / 2, logoY, { width: logoWidth });
        } catch {
            doc.fontSize(12).fillColor("red").text("⚠ Logo no encontrado", { align: "center" });
        }

        doc.moveDown(6);
        doc.fontSize(26).fillColor("#333333").text("Informe de Auditoría", { align: "center" });
        doc.moveDown(15);
        doc.fontSize(14).fillColor("#555555").text(`Generado el ${new Date().toLocaleString()}`, { align: "center" });
        doc.addPage();

        // ================= FUNCIONES =================
        const addTableHeader = (doc, headers, x, y, colWidths, rowHeight, fillColor = "#4a90e2") => {
            doc.fontSize(12).fillColor("#FFFFFF");
            doc.rect(x, y, Object.values(colWidths).reduce((a, b) => a + b, 0), rowHeight).fill(fillColor);
            let currX = x;
            headers.forEach((header, idx) => {
                doc.fillColor("#FFFFFF").text(header, currX + 5, y + 5, { width: Object.values(colWidths)[idx], align: "left" });
                currX += Object.values(colWidths)[idx];
            });
        };

        const addTableRow = (doc, row, x, y, colWidths, rowHeight, isOdd, headers = null) => {
            // Calcular altura real de fila según contenido
            const alturaFila = Math.max(rowHeight, ...Object.keys(colWidths).map((key) => doc.heightOfString(row[key], { width: colWidths[key] }))) + 5;

            // Saltar página si es necesario antes de dibujar
            if (y + alturaFila > doc.page.height - 50) {
                doc.addPage();
                y = 50;
                if (headers) {
                    addTableHeader(doc, headers, x, y, colWidths, rowHeight);
                    y += rowHeight;
                }
            }

            // Dibujar fila
            doc.rect(x, y, Object.values(colWidths).reduce((a, b) => a + b, 0), alturaFila).fill(isOdd ? "#f2f2f2" : "#ffffff");
            doc.fillColor("#000000").fontSize(10);
            let currX = x;
            Object.keys(colWidths).forEach((key) => {
                doc.text(row[key], currX + 5, y + 5, { width: colWidths[key], align: "left" });
                currX += colWidths[key];
            });

            return y + alturaFila;
        };

        // ================= GENERAR SECCIONES =================
        const generarSeccion = async (titulo, query, colWidths, headers, formatRow) => {
            let y = doc.y + 10;
            const rowsData = (await pool.query(query)).rows.map(formatRow);

            doc.fontSize(16).fillColor("#333333").text(titulo, 50, y, { underline: true });
            y += 25;
            addTableHeader(doc, headers, 50, y, colWidths, 20);
            y += 20;

            rowsData.forEach((row, idx) => {
                y = addTableRow(doc, row, 50, y, colWidths, 20, idx % 2 === 0, headers);
            });

            doc.moveDown(2);
        };

        // ===== INVENTARIO =====
        await generarSeccion(
            "Inventario General",
            `
            SELECT it.nombre, i.cantidad, i.costo_unitario, i.ubicacion_actual
            FROM inventario i
            JOIN items it ON i.item_id = it.id
            ORDER BY it.nombre;
            `,
            { nombre: 150, cantidad: 60, costo: 80, total: 80, ubicacion: 120 },
            ["Nombre", "Cantidad", "Costo Unitario", "Total", "Ubicación"],
            (row) => ({
                nombre: row.nombre,
                cantidad: row.cantidad.toString(),
                costo: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(row.costo_unitario),
                total: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(row.cantidad * row.costo_unitario),
                ubicacion: row.ubicacion_actual,
            })
        );

        // ===== MANTENIMIENTOS =====
        await generarSeccion(
            "Mantenimientos Programados",
            `
            SELECT m.nombre, m.estado, m.fecha_programada, u.nombre as responsable
            FROM mantenimientos m
            JOIN usuarios u ON m.operario_id = u.id
            ORDER BY m.fecha_programada DESC;
            `,
            { nombre: 200, estado: 80, fecha: 100, responsable: 150 },
            ["Nombre", "Estado", "Fecha Programada", "Responsable"],
            (row) => ({
                nombre: row.nombre,
                estado: row.estado,
                fecha: new Date(row.fecha_programada).toLocaleDateString("es-ES"),
                responsable: row.responsable,
            })
        );

        // ===== INCIDENTES =====
        await generarSeccion(
            "Incidentes",
            `SELECT descripcion, estado, fecha_creacion FROM incidente ORDER BY fecha_creacion DESC;`,
            { descripcion: 300, estado: 80, fecha: 150 },
            ["Descripción", "Estado", "Fecha Creación"],
            (row) => ({
                descripcion: row.descripcion,
                estado: row.estado,
                fecha: new Date(row.fecha_creacion).toLocaleString(),
            })
        );

        // ===== USUARIOS =====
        await generarSeccion(
            "Usuarios y Roles",
            `SELECT u.nombre, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id ORDER BY u.nombre;`,
            { nombre: 250, rol: 150 },
            ["Nombre", "Rol"],
            (row) => ({
                nombre: row.nombre,
                rol: row.rol,
            })
        );

        // ================= PIE DE PÁGINA =================
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor("#888888").text(`Página ${i + 1} de ${range.count}`, 0, doc.page.height - 30, { align: "center" });
        }

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al generar PDF" });
    }
};

module.exports = { obtenerAuditoria, generarPDF };
