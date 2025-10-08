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

// Generar PDF profesional con logo, portada y secciones según módulos seleccionados
const generarPDF = async (req, res) => {
    let doc;
    try {
        const { modulos, fechaInicio, fechaFin } = req.query;
        
        // Validar módulos seleccionados
        let modulosSeleccionados = [];
        if (modulos) {
            modulosSeleccionados = Array.isArray(modulos) ? modulos : [modulos];
        } else {
            // Si no se especifican módulos, incluir todos
            modulosSeleccionados = ['inventario', 'mantenimientos', 'incidentes', 'usuarios'];
        }

        if (modulosSeleccionados.length === 0) {
            return res.status(400).json({ message: "No se han seleccionado módulos para el informe" });
        }

        doc = new PDFDocument({ 
            size: "A4", 
            margins: { top: 50, bottom: 70, left: 50, right: 50 } 
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=informe_auditoria.pdf");
        doc.pipe(res);

        // Array para almacenar páginas y contenido
        const pages = [];
        let currentPage = 0;

        // ================= FUNCIONES AUXILIARES =================
        const addPageNumber = () => {
            const page = doc.page;
            const pageNumber = `Página ${currentPage + 1}`;
            
            doc.save()
               .fontSize(8)
               .fillColor('#888888')
               .text(pageNumber, 50, page.height - 40, {
                   width: page.width - 100,
                   align: 'center'
               })
               .restore();
        };

        const addTableHeader = (doc, headers, x, y, colWidths, rowHeight, fillColor = "#00482B") => {
            doc.fontSize(10).fillColor("#FFFFFF");
            const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
            doc.rect(x, y, totalWidth, rowHeight).fill(fillColor);
            
            let currX = x;
            headers.forEach((header, idx) => {
                const width = Object.values(colWidths)[idx];
                doc.text(header, currX + 5, y + 7, { 
                    width: width - 10, 
                    align: "left"
                });
                currX += width;
            });
            return y + rowHeight;
        };

        const addTableRow = (doc, row, x, y, colWidths, rowHeight, isOdd) => {
            // Calcular altura máxima de la fila
            const alturas = Object.keys(colWidths).map((key, idx) => {
                const width = Object.values(colWidths)[idx] - 10;
                return doc.heightOfString(row[key] || '', { 
                    width: width,
                    align: "left"
                });
            });
            const alturaFila = Math.max(rowHeight, ...alturas) + 10;

            // Verificar si necesita nueva página
            if (y + alturaFila > doc.page.height - 70) {
                addPageNumber();
                doc.addPage();
                currentPage++;
                y = 50;
            }

            // Fondo de la fila
            doc.rect(x, y, Object.values(colWidths).reduce((a, b) => a + b, 0), alturaFila)
               .fill(isOdd ? "#f8f9fa" : "#ffffff");
            
            // Contenido de la fila
            doc.fillColor("#000000").fontSize(8);
            let currX = x;
            Object.keys(colWidths).forEach((key, idx) => {
                const width = Object.values(colWidths)[idx];
                doc.text(row[key] || '', currX + 5, y + 5, { 
                    width: width - 10, 
                    align: "left"
                });
                currX += width;
            });

            return y + alturaFila;
        };

        // Función para generar cada sección
        const generarSeccion = async (titulo, query, colWidths, headers, formatRow, condicionesFecha = '') => {
            let y = doc.y;
            
            // Si no hay suficiente espacio para el título, nueva página
            if (y > doc.page.height - 150) {
                addPageNumber();
                doc.addPage();
                currentPage++;
                y = 50;
            }

            // Título de la sección
            doc.fontSize(14).fillColor("#00482B").text(titulo, 50, y, { underline: true });
            y += 30;

            // Aplicar filtros de fecha si existen
            let queryFinal = query;
            const condiciones = [];
            const params = [];
            
            if (fechaInicio && condicionesFecha) {
                condiciones.push(`${condicionesFecha} >= $${condiciones.length + 1}`);
                params.push(fechaInicio);
            }
            if (fechaFin && condicionesFecha) {
                condiciones.push(`${condicionesFecha} <= $${condiciones.length + 1}`);
                params.push(fechaFin + ' 23:59:59');
            }
            
            if (condiciones.length > 0) {
                const whereClause = query.toUpperCase().includes('WHERE') ? 'AND' : 'WHERE';
                queryFinal = query.replace(';', '') + ` ${whereClause} ${condiciones.join(' AND ')}`;
            }

            // Obtener datos
            const result = await pool.query(queryFinal, params);
            const rowsData = result.rows.map(formatRow);

            if (rowsData.length === 0) {
                doc.fontSize(10).fillColor("#666666").text("No hay datos disponibles para este período.", 50, y);
                y += 20;
            } else {
                // Verificar espacio para el header de la tabla
                if (y + 50 > doc.page.height - 70) {
                    addPageNumber();
                    doc.addPage();
                    currentPage++;
                    y = 50;
                }

                y = addTableHeader(doc, headers, 50, y, colWidths, 20);
                
                // Agregar filas
                rowsData.forEach((row, idx) => {
                    y = addTableRow(doc, row, 50, y, colWidths, 20, idx % 2 === 0);
                });
            }

            doc.y = y + 20;
            return doc.y;
        };

        // ================= PORTADA =================
        currentPage = 0;
        
        try {
            const logoPath = path.join(__dirname, "../assets/logoU.png");
            const logoWidth = 120;
            const logoY = doc.page.height / 3 - 60;
            doc.image(logoPath, (doc.page.width - logoWidth) / 2, logoY, { width: logoWidth });
        } catch (error) {
            console.log("Logo no encontrado, continuando sin logo...");
        }

        doc.moveDown(6);
        doc.fontSize(26).fillColor("#333333").text("Informe de Auditoría", { align: "center" });
        doc.moveDown(1);
        doc.fontSize(14).fillColor("#666666").text("Sistema de Gestión de Inventarios", { align: "center" });
        
        // Mostrar módulos incluidos
        doc.moveDown(2);
        doc.fontSize(12).fillColor("#444444").text("Módulos incluidos:", { align: "center" });
        const modulosTexto = modulosSeleccionados.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ");
        doc.fontSize(10).fillColor("#666666").text(modulosTexto, { align: "center" });
        
        // Mostrar rango de fechas si se especificó
        if (fechaInicio || fechaFin) {
            doc.moveDown(1);
            const rangoFechas = `Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`;
            doc.fontSize(10).fillColor("#666666").text(rangoFechas, { align: "center" });
        }
        
        doc.moveDown(8);
        doc.fontSize(14).fillColor("#555555").text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: "center" });

        // Agregar número de página en la portada
        addPageNumber();

        // ================= GENERAR SECCIONES SELECCIONADAS =================
        doc.addPage();
        currentPage++;

        // Inventario
        if (modulosSeleccionados.includes('inventario')) {
            await generarSeccion(
                "1. Inventario General",
                `SELECT it.nombre, i.cantidad, i.costo_unitario, i.ubicacion_actual
                 FROM inventario i
                 JOIN items it ON i.item_id = it.id
                 ORDER BY it.nombre`,
                { nombre: 150, cantidad: 60, costo: 80, total: 80, ubicacion: 120 },
                ["Nombre", "Cantidad", "Costo Unitario", "Total", "Ubicación"],
                (row) => ({
                    nombre: row.nombre || '',
                    cantidad: (row.cantidad || 0).toString(),
                    costo: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(row.costo_unitario || 0),
                    total: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format((row.cantidad || 0) * (row.costo_unitario || 0)),
                    ubicacion: row.ubicacion_actual || '',
                })
            );
        }

        // Mantenimientos
        if (modulosSeleccionados.includes('mantenimientos')) {
            await generarSeccion(
                "2. Mantenimientos Programados",
                `SELECT m.id, m.nombre, m.estado, m.fecha_programada, u.nombre as responsable
                 FROM mantenimientos m
                 JOIN usuarios u ON m.operario_id = u.id
                 ORDER BY m.fecha_programada DESC`,
                { nombre: 180, estado: 70, fecha: 90, responsable: 120 },
                ["Nombre", "Estado", "Fecha Programada", "Responsable"],
                (row) => ({
                    nombre: row.nombre || '',
                    estado: row.estado || '',
                    fecha: row.fecha_programada ? new Date(row.fecha_programada).toLocaleDateString("es-ES") : '',
                    responsable: row.responsable || '',
                }),
                'm.fecha_programada'
            );
        }

        // Incidentes
        if (modulosSeleccionados.includes('incidentes')) {
            await generarSeccion(
                "3. Incidentes",
                `SELECT id, descripcion, estado, fecha_creacion 
                 FROM incidente 
                 ORDER BY fecha_creacion DESC`,
                { descripcion: 250, estado: 70, fecha: 130 },
                ["Descripción", "Estado", "Fecha Creación"],
                (row) => ({
                    descripcion: row.descripcion || '',
                    estado: row.estado || '',
                    fecha: row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleString("es-ES") : '',
                }),
                'fecha_creacion'
            );
        }

        // Usuarios
        if (modulosSeleccionados.includes('usuarios')) {
            await generarSeccion(
                "4. Usuarios y Roles",
                `SELECT u.nombre, r.nombre as rol 
                 FROM usuarios u 
                 JOIN roles r ON u.rol_id = r.id 
                 ORDER BY u.nombre`,
                { nombre: 250, rol: 150 },
                ["Nombre", "Rol"],
                (row) => ({
                    nombre: row.nombre || '',
                    rol: row.rol || '',
                })
            );
        }

        // Agregar número de página en la última página
        addPageNumber();

        doc.end();

    } catch (error) {
        console.error("Error al generar PDF:", error);
        
        // Si el documento ya fue iniciado, intentar finalizarlo
        if (doc) {
            try {
                doc.end();
            } catch (e) {
                console.error("Error al finalizar documento:", e);
            }
        }
        
        // Verificar si los headers ya fueron enviados
        if (!res.headersSent) {
            return res.status(500).json({ 
                message: "Error al generar el PDF",
                error: error.message 
            });
        }
    }
};

module.exports = { obtenerAuditoria, generarPDF };