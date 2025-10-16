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
            modulosSeleccionados = ['inventario', 'mantenimientos', 'incidentes', 'usuarios'];
        }

        if (modulosSeleccionados.length === 0) {
            return res.status(400).json({ message: "No se han seleccionado módulos para el informe" });
        }

        doc = new PDFDocument({
            size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=informe_auditoria.pdf");
        doc.pipe(res);

        // ================= FUNCIONES AUXILIARES =================
        const addTableHeader = (doc, headers, x, y, colWidths, rowHeight) => {
            const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
            doc.save();
            doc.rect(x, y, totalWidth, rowHeight).fill("#006D3B"); // Verde profesional
            doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold");

            let currX = x;
            headers.forEach((header, idx) => {
                const width = Object.values(colWidths)[idx];
                doc.text(header, currX + 5, y + 6, {
                    width: width - 10,
                    align: "left"
                });
                currX += width;
            });

            doc.restore();
            return y + rowHeight;
        };

        const addTableRow = (doc, row, x, y, colWidths, rowHeight, isOdd) => {
            const alturas = Object.keys(colWidths).map((key, idx) => {
                const width = Object.values(colWidths)[idx] - 10;
                return doc.heightOfString(row[key] || '', {
                    width: width,
                    align: "left"
                });
            });
            const alturaFila = Math.max(rowHeight, ...alturas) + 8;

            if (y + alturaFila > doc.page.height - 60) {
                doc.addPage();
                y = 80;
            }

            doc.save();
            doc.rect(x, y, Object.values(colWidths).reduce((a, b) => a + b, 0), alturaFila)
               .fill(isOdd ? "#F6FFF9" : "#FFFFFF");
            doc.restore();

            doc.fillColor("#000000").fontSize(9);
            let currX = x;
            Object.keys(colWidths).forEach((key, idx) => {
                const width = Object.values(colWidths)[idx];
                doc.text(row[key] || '', currX + 5, y + 4, {
                    width: width - 10,
                    align: "left"
                });
                currX += width;
            });

            return y + alturaFila;
        };

        // Función para generar gráfica de mantenimientos
        const generarGraficaMantenimientos = async (doc, y) => {
            try {
                // Consultar estadísticas de mantenimientos
                let query = `SELECT estado, COUNT(*) as cantidad FROM mantenimientos`;
                const params = [];
                
                // Agregar filtros de fecha si existen
                const whereConditions = [];
                if (fechaInicio) {
                    whereConditions.push(`fecha_programada >= $${params.length + 1}`);
                    params.push(fechaInicio);
                }
                if (fechaFin) {
                    whereConditions.push(`fecha_programada <= $${params.length + 1}`);
                    params.push(fechaFin + ' 23:59:59');
                }
                
                if (whereConditions.length > 0) {
                    query += ` WHERE ${whereConditions.join(' AND ')}`;
                }
                
                query += ` GROUP BY estado`;
                
                const statsResult = await pool.query(query, params);
                const stats = statsResult.rows;

                if (stats.length === 0) {
                    doc.fontSize(10).fillColor("#666666").text("No hay datos de mantenimientos para generar la gráfica.", 50, y);
                    return y + 30;
                }

                // Calcular totales
                const totalMantenimientos = stats.reduce((total, item) => total + parseInt(item.cantidad), 0);
                
                // Buscar cada estado específico
                const completados = stats.find(item => item.estado && item.estado.toLowerCase().includes('completado'))?.cantidad || 0;
                const pendientes = stats.find(item => item.estado && item.estado.toLowerCase().includes('pendiente'))?.cantidad || 0;
                const enProgreso = stats.find(item => item.estado && item.estado.toLowerCase().includes('progreso'))?.cantidad || 0;

                // Título de la gráfica
                doc.fontSize(12).fillColor("#00482B").font("Helvetica-Bold")
                   .text("Estadísticas de Mantenimientos", 50, y);
                y += 20;

                // Dimensiones de la gráfica
                const chartWidth = 300;
                const chartHeight = 150;
                const chartX = (doc.page.width - chartWidth) / 2;
                const chartY = y;

                // Dibujar fondo de la gráfica
                doc.rect(chartX, chartY, chartWidth, chartHeight).fill("#F8F8F8").stroke("#DDD");
                
                if (totalMantenimientos > 0) {
                    const barWidth = 60;
                    const maxBarHeight = 100;
                    const spacing = 30;
                    const startX = chartX + 50;

                    // Colores para cada estado
                    const colores = {
                        'Completado': '#28A745',
                        'Pendiente': '#DC3545', 
                        'En Progreso': '#FFC107'
                    };

                    // Dibujar barras
                    let currentX = startX;
                    
                    // Barra Completados
                    const barHeightCompletados = (completados / totalMantenimientos) * maxBarHeight;
                    const barYCompletados = chartY + chartHeight - barHeightCompletados - 20;
                    
                    doc.rect(currentX, barYCompletados, barWidth, barHeightCompletados)
                       .fill(colores['Completado']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
                       .text(completados.toString(), currentX, barYCompletados + barHeightCompletados/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });
                    
                    // Barra Pendientes
                    currentX += barWidth + spacing;
                    const barHeightPendientes = (pendientes / totalMantenimientos) * maxBarHeight;
                    const barYPendientes = chartY + chartHeight - barHeightPendientes - 20;
                    
                    doc.rect(currentX, barYPendientes, barWidth, barHeightPendientes)
                       .fill(colores['Pendiente']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
                       .text(pendientes.toString(), currentX, barYPendientes + barHeightPendientes/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });
                    
                    // Barra En Progreso
                    currentX += barWidth + spacing;
                    const barHeightEnProgreso = (enProgreso / totalMantenimientos) * maxBarHeight;
                    const barYEnProgreso = chartY + chartHeight - barHeightEnProgreso - 20;
                    
                    doc.rect(currentX, barYEnProgreso, barWidth, barHeightEnProgreso)
                       .fill(colores['En Progreso']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold")
                       .text(enProgreso.toString(), currentX, barYEnProgreso + barHeightEnProgreso/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });

                    // Etiquetas de las barras
                    doc.fillColor("#333333").fontSize(9);
                    let labelX = startX;
                    
                    doc.text("Completados", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });
                    labelX += barWidth + spacing;
                    doc.text("Pendientes", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });
                    labelX += barWidth + spacing;
                    doc.text("En Progreso", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });

                    // Leyenda
                    const legendY = chartY + chartHeight + 20;
                    doc.fontSize(8);
                    
                    let legendX = chartX + 20;
                    Object.keys(colores).forEach((estado, index) => {
                        // Cuadro de color
                        doc.rect(legendX, legendY, 8, 8).fill(colores[estado]);
                        // Texto
                        doc.fillColor("#333333").text(estado, legendX + 12, legendY - 2);
                        legendX += 70;
                    });

                    // Estadísticas detalladas
                    const statsY = legendY + 25;
                    doc.fontSize(9).fillColor("#00482B");
                    doc.text(`Total de mantenimientos: ${totalMantenimientos}`, chartX, statsY);
                    doc.text(`Completados: ${completados} (${((completados/totalMantenimientos)*100).toFixed(1)}%)`, chartX, statsY + 12);
                    doc.text(`Pendientes: ${pendientes} (${((pendientes/totalMantenimientos)*100).toFixed(1)}%)`, chartX, statsY + 24);
                    doc.text(`En progreso: ${enProgreso} (${((enProgreso/totalMantenimientos)*100).toFixed(1)}%)`, chartX, statsY + 36);

                    y = statsY + 50;
                } else {
                    doc.fontSize(10).fillColor("#666666").text("No hay datos suficientes para mostrar la gráfica.", chartX + 20, chartY + 50);
                    y = chartY + 70;
                }

                return y;

            } catch (error) {
                console.error("Error al generar gráfica de mantenimientos:", error);
                doc.fontSize(10).fillColor("#FF0000").text("Error al generar gráfica de mantenimientos", 50, y);
                return y + 30;
            }
        };

        // Función para generar gráfica de incidentes
        const generarGraficaIncidentes = async (doc, y) => {
            try {
                // Consultar estadísticas de incidentes
                let query = `SELECT estado, COUNT(*) as cantidad FROM incidente`;
                const params = [];
                
                // Agregar filtros de fecha si existen
                const whereConditions = [];
                if (fechaInicio) {
                    whereConditions.push(`fecha_creacion >= $${params.length + 1}`);
                    params.push(fechaInicio);
                }
                if (fechaFin) {
                    whereConditions.push(`fecha_creacion <= $${params.length + 1}`);
                    params.push(fechaFin + ' 23:59:59');
                }
                
                if (whereConditions.length > 0) {
                    query += ` WHERE ${whereConditions.join(' AND ')}`;
                }
                
                query += ` GROUP BY estado`;
                
                const statsResult = await pool.query(query, params);
                const stats = statsResult.rows;

                if (stats.length === 0) {
                    doc.fontSize(10).fillColor("#666666").text("No hay datos de incidentes para generar la gráfica.", 50, y);
                    return y + 30;
                }

                // Calcular totales
                const totalIncidentes = stats.reduce((total, item) => total + parseInt(item.cantidad), 0);
                
                // Buscar cada estado específico
                const resueltos = stats.find(item => item.estado && item.estado.toLowerCase().includes('resuelto'))?.cantidad || 0;
                const asignados = stats.find(item => item.estado && item.estado.toLowerCase().includes('asignado'))?.cantidad || 0;
                const pendientes = stats.find(item => item.estado && item.estado.toLowerCase().includes('pendiente'))?.cantidad || 0;

                // Título de la gráfica
                doc.fontSize(12).fillColor("#00482B").font("Helvetica-Bold")
                   .text("Estadísticas de Incidentes", 50, y);
                y += 20;

                // Dimensiones de la gráfica
                const chartWidth = 300;
                const chartHeight = 150;
                const chartX = (doc.page.width - chartWidth) / 2;
                const chartY = y;

                // Dibujar fondo de la gráfica
                doc.rect(chartX, chartY, chartWidth, chartHeight).fill("#F8F8F8").stroke("#DDD");
                
                if (totalIncidentes > 0) {
                    const barWidth = 60;
                    const maxBarHeight = 100;
                    const spacing = 30;
                    const startX = chartX + 50;

                    // Colores para cada estado
                    const colores = {
                        'Resuelto': '#28A745',
                        'Asignado': '#17A2B8', 
                        'Pendiente': '#DC3545'
                    };

                    // Dibujar barras
                    let currentX = startX;
                    
                    // Barra Resueltos
                    const barHeightResueltos = (resueltos / totalIncidentes) * maxBarHeight;
                    const barYResueltos = chartY + chartHeight - barHeightResueltos - 20;
                    
                    doc.rect(currentX, barYResueltos, barWidth, barHeightResueltos)
                       .fill(colores['Resuelto']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
                       .text(resueltos.toString(), currentX, barYResueltos + barHeightResueltos/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });
                    
                    // Barra Asignados
                    currentX += barWidth + spacing;
                    const barHeightAsignados = (asignados / totalIncidentes) * maxBarHeight;
                    const barYAsignados = chartY + chartHeight - barHeightAsignados - 20;
                    
                    doc.rect(currentX, barYAsignados, barWidth, barHeightAsignados)
                       .fill(colores['Asignado']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
                       .text(asignados.toString(), currentX, barYAsignados + barHeightAsignados/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });
                    
                    // Barra Pendientes
                    currentX += barWidth + spacing;
                    const barHeightPendientes = (pendientes / totalIncidentes) * maxBarHeight;
                    const barYPendientes = chartY + chartHeight - barHeightPendientes - 20;
                    
                    doc.rect(currentX, barYPendientes, barWidth, barHeightPendientes)
                       .fill(colores['Pendiente']);
                    
                    // Texto dentro de la barra
                    doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold")
                       .text(pendientes.toString(), currentX, barYPendientes + barHeightPendientes/2 - 5, { 
                           width: barWidth, 
                           align: 'center' 
                       });

                    // Etiquetas de las barras
                    doc.fillColor("#333333").fontSize(9);
                    let labelX = startX;
                    
                    doc.text("Resueltos", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });
                    labelX += barWidth + spacing;
                    doc.text("Asignados", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });
                    labelX += barWidth + spacing;
                    doc.text("Pendientes", labelX, chartY + chartHeight - 5, { width: barWidth, align: 'center' });

                    // Leyenda
                    const legendY = chartY + chartHeight + 20;
                    doc.fontSize(8);
                    
                    let legendX = chartX + 20;
                    Object.keys(colores).forEach((estado, index) => {
                        // Cuadro de color
                        doc.rect(legendX, legendY, 8, 8).fill(colores[estado]);
                        // Texto
                        doc.fillColor("#333333").text(estado, legendX + 12, legendY - 2);
                        legendX += 70;
                    });

                    // Estadísticas detalladas
                    const statsY = legendY + 25;
                    doc.fontSize(9).fillColor("#00482B");
                    doc.text(`Total de incidentes: ${totalIncidentes}`, chartX, statsY);
                    doc.text(`Resueltos: ${resueltos} (${((resueltos/totalIncidentes)*100).toFixed(1)}%)`, chartX, statsY + 12);
                    doc.text(`Asignados: ${asignados} (${((asignados/totalIncidentes)*100).toFixed(1)}%)`, chartX, statsY + 24);
                    doc.text(`Pendientes: ${pendientes} (${((pendientes/totalIncidentes)*100).toFixed(1)}%)`, chartX, statsY + 36);

                    y = statsY + 50;
                } else {
                    doc.fontSize(10).fillColor("#666666").text("No hay datos suficientes para mostrar la gráfica.", chartX + 20, chartY + 50);
                    y = chartY + 70;
                }

                return y;

            } catch (error) {
                console.error("Error al generar gráfica de incidentes:", error);
                doc.fontSize(10).fillColor("#FF0000").text("Error al generar gráfica de incidentes", 50, y);
                return y + 30;
            }
        };

        const generarSeccion = async (titulo, query, colWidths, headers, formatRow, condicionesFecha = '', calcularTotal = null) => {
            let y = doc.y;

            if (y > doc.page.height - 150) {
                doc.addPage();
                y = 80;
            }

            doc.rect(50, y - 5, doc.page.width - 100, 25).fill("#FFFFFF");
            doc.fontSize(14).fillColor("#00482B").font("Helvetica-Bold").text(titulo, 55, y);
            y += 30;

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

            const result = await pool.query(queryFinal, params);
            const rowsData = result.rows.map(formatRow);

            let totalInventario = 0;
            if (calcularTotal && result.rows.length > 0) {
                totalInventario = result.rows.reduce((total, row) => {
                    return total + ((row.cantidad || 0) * (row.costo_unitario || 0));
                }, 0);
            }

            if (rowsData.length === 0) {
                doc.fontSize(10).fillColor("#666666").text("No hay datos disponibles para este período.", 50, y);
                y += 20;
            } else {
                if (calcularTotal) {
                    doc.fontSize(10).fillColor("#00482B")
                       .text(`Valor total del inventario: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(totalInventario)}`, 50, y);
                    y += 20;
                }

                if (y + 50 > doc.page.height - 70) {
                    doc.addPage();
                    y = 80;
                }

                y = addTableHeader(doc, headers, 50, y, colWidths, 22);

                rowsData.forEach((row, idx) => {
                    y = addTableRow(doc, row, 50, y, colWidths, 18, idx % 2 === 0);
                });
            }

            doc.y = y + 20;
            return doc.y;
        };

        // ================= PORTADA =================
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
        doc.moveDown(10);
        doc.fontSize(14).fillColor("#666666").text("Plataforma BIM", { align: "center" });

        doc.moveDown(2);
        doc.fontSize(12).fillColor("#444444").text("Módulos incluidos:", { align: "center" });
        const modulosTexto = modulosSeleccionados.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ");
        doc.fontSize(10).fillColor("#666666").text(modulosTexto, { align: "center" });

        if (fechaInicio || fechaFin) {
            doc.moveDown(1);
            const rangoFechas = `Período: ${fechaInicio || 'Inicio'} - ${fechaFin || 'Fin'}`;
            doc.fontSize(10).fillColor("#666666").text(rangoFechas, { align: "center" });
        }

        doc.moveDown(20);
        doc.fontSize(12).fillColor("#555555").text(`Generado el ${new Date().toLocaleString('es-ES')}`, { align: "center" });

        // ================= SECCIONES =================
        doc.addPage();

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
                }),
                '',
                true
            );
        }

        if (modulosSeleccionados.includes('mantenimientos')) {
            // Primero generar la gráfica de mantenimientos
            let y = doc.y;
            if (y > doc.page.height - 200) {
                doc.addPage();
                y = 80;
            }

            doc.rect(50, y - 5, doc.page.width - 100, 25).fill("#FFFFFF");
            doc.fontSize(14).fillColor("#00482B").font("Helvetica-Bold").text("2. Mantenimientos Programados", 55, y);
            y += 30;

            // Generar gráfica
            y = await generarGraficaMantenimientos(doc, y);
            doc.y = y;

            // Luego generar la tabla de mantenimientos
            await generarSeccion(
                "", // Título vacío porque ya lo pusimos arriba
                `SELECT m.nombre, m.estado, m.fecha_programada, u.nombre as responsable
                 FROM mantenimientos m
                 JOIN usuarios u ON m.operario_id = u.id
                 ORDER BY m.fecha_programada DESC`,
                { nombre: 180, estado: 70, fecha: 110, responsable: 120 },
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

        if (modulosSeleccionados.includes('incidentes')) {
            // Primero generar la gráfica de incidentes
            let y = doc.y;
            if (y > doc.page.height - 200) {
                doc.addPage();
                y = 80;
            }

            doc.rect(50, y - 5, doc.page.width - 100, 25).fill("#FFFFFF");
            doc.fontSize(14).fillColor("#00482B").font("Helvetica-Bold").text("3. Incidentes", 55, y);
            y += 30;

            // Generar gráfica
            y = await generarGraficaIncidentes(doc, y);
            doc.y = y;

            // Luego generar la tabla de incidentes
            await generarSeccion(
                "", // Título vacío porque ya lo pusimos arriba
                `SELECT descripcion, estado, fecha_creacion 
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

        doc.end();

    } catch (error) {
        console.error("Error al generar PDF:", error);
        if (doc) {
            try { doc.end(); } catch (e) { console.error("Error al finalizar documento:", e); }
        }
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error al generar el PDF", error: error.message });
        }
    }
};

module.exports = { obtenerAuditoria, generarPDF };