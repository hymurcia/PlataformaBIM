// src/components/PanelInformes.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Button,
  Spinner,
  Tabs,
  Tab,
  Container,
  Alert,
  Form,
  Card,
  Row,
  Col,
} from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";
const API_URL = `${API_BASE_URL}/informes`;

const TablaAuditoria = ({ headers, rows, renderRow }) => {
  if (!rows || rows.length === 0) {
    return (
      <Alert variant="warning" className="mt-3 text-center fw-semibold">
        No hay datos disponibles.
      </Alert>
    );
  }

  return (
    <div
      className="table-container shadow-sm bg-white rounded-4"
      style={{
        maxHeight: "400px",
        overflowY: "auto",
        border: "1px solid #dee2e6",
      }}
    >
      <Table striped bordered hover responsive className="mb-0">
        <thead className="table-light sticky-top" style={{ top: 0, zIndex: 2 }}>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="text-center align-middle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </Table>
    </div>
  );
};

const PanelInformes = () => {
  const [data, setData] = useState({
    inventario: [],
    mantenimientos: [],
    incidentes: [],
    usuarios: [],
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("inventario");
  const [modulosSeleccionados, setModulosSeleccionados] = useState({
    inventario: true,
    mantenimientos: true,
    incidentes: true,
    usuarios: true,
  });

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setData(res.data || {});
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar auditoría", err);
      setError("No se pudo cargar la información de auditoría.");
      setLoading(false);
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setModulosSeleccionados((prev) => ({ ...prev, [name]: checked }));
  };

  const descargarPDF = async () => {
    try {
      setDownloading(true);
      
      // Verificar que al menos un módulo esté seleccionado
      const modulosActivos = Object.keys(modulosSeleccionados).filter(
        (m) => modulosSeleccionados[m]
      );
      
      if (modulosActivos.length === 0) {
        setError("Por favor selecciona al menos un módulo para generar el informe.");
        setDownloading(false);
        return;
      }

      // Construir parámetros de consulta
      const params = new URLSearchParams();
      modulosActivos.forEach(modulo => params.append('modulos', modulo));
      
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      // Crear URL para descargar el PDF
      const pdfUrl = `${API_URL}/pdf?${params.toString()}`;
      
      // Abrir en nueva pestaña para vista previa
      window.open(pdfUrl, '_blank');
      
      setDownloading(false);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      setError("Error al generar el PDF. Por favor, intenta nuevamente.");
      setDownloading(false);
    }
  };

  const handleSelect = (key) => {
    setSelectedTab(key);
  };

  // Filtrar datos según fechas seleccionadas
  const filtrarPorFechas = (datos, campoFecha) => {
    if (!fechaInicio && !fechaFin) return datos;
    
    return datos.filter(item => {
      const fechaItem = new Date(item[campoFecha]);
      if (fechaInicio && fechaItem < new Date(fechaInicio)) return false;
      if (fechaFin && fechaItem > new Date(fechaFin + 'T23:59:59')) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando auditoría...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="shadow-sm rounded-3">
          {error}
        </Alert>
        <Button onClick={cargarDatos} variant="primary" className="mt-3">
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 1,
        }}
      />

      <Container className="my-5" style={{ zIndex: 2 }}>
        <Card
          className="shadow border-0"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <Card.Header
            className="text-center py-4"
            style={{
              backgroundColor: "#00482B",
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
            }}
          >
            <h2 className="mb-0" style={{ color: "#FBE122", fontWeight: "bold" }}>
              📈 Panel de Informes
            </h2>
          </Card.Header>

          <Card.Body className="p-4">
            <Alert
              variant="info"
              className="shadow-sm rounded-3 text-center small py-2"
            >
              Selecciona los módulos y rango de fechas para generar el informe PDF.
            </Alert>

            <Form className="mb-4">
              <Form.Label className="fw-semibold">Módulos a incluir:</Form.Label>
              <div className="d-flex flex-wrap gap-4 mb-3">
                {Object.keys(modulosSeleccionados).map((modulo) => (
                  <Form.Check
                    key={modulo}
                    type="switch"
                    id={`switch-${modulo}`}
                    label={modulo.charAt(0).toUpperCase() + modulo.slice(1)}
                    name={modulo}
                    checked={modulosSeleccionados[modulo]}
                    onChange={handleCheckboxChange}
                  />
                ))}
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Fecha Inicio</Form.Label>
                    <Form.Control
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Fecha Fin</Form.Label>
                    <Form.Control
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>

            <Tabs activeKey={selectedTab} onSelect={handleSelect} className="mb-4 shadow-sm" fill>
              {/* Inventario */}
              <Tab eventKey="inventario" title="Inventario">
                <TablaAuditoria
                  headers={["Nombre", "Cantidad", "Costo Unitario", "Ubicación"]}
                  rows={data.inventario}
                  renderRow={(item, idx) => (
                    <tr key={idx}>
                      <td>{item.nombre}</td>
                      <td className="text-center">{item.cantidad}</td>
                      <td className="text-end">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                        }).format(item.costo_unitario)}
                      </td>
                      <td>{item.ubicacion_actual}</td>
                    </tr>
                  )}
                />
              </Tab>

              {/* Mantenimientos */}
              <Tab eventKey="mantenimientos" title="Mantenimientos">
                <TablaAuditoria
                  headers={["ID", "Nombre", "Estado", "Fecha Programada", "Responsable"]}
                  rows={filtrarPorFechas(data.mantenimientos, 'fecha_programada')}
                  renderRow={(m, idx) => (
                    <tr key={idx}>
                      <td>{m.id}</td>
                      <td>{m.nombre}</td>
                      <td>{m.estado}</td>
                      <td>{new Date(m.fecha_programada).toLocaleDateString()}</td>
                      <td>{m.responsable}</td>
                    </tr>
                  )}
                />
              </Tab>

              {/* Incidentes */}
              <Tab eventKey="incidentes" title="Incidentes">
                <TablaAuditoria
                  headers={["ID", "Descripción", "Estado", "Fecha Creación"]}
                  rows={filtrarPorFechas(data.incidentes, 'fecha_creacion')}
                  renderRow={(i, idx) => (
                    <tr key={idx}>
                      <td>{i.id}</td>
                      <td>{i.descripcion}</td>
                      <td>{i.estado}</td>
                      <td>{new Date(i.fecha_creacion).toLocaleString()}</td>
                    </tr>
                  )}
                />
              </Tab>

              {/* Usuarios */}
              <Tab eventKey="usuarios" title="Usuarios y Roles">
                <TablaAuditoria
                  headers={["ID", "Nombre", "Rol"]}
                  rows={data.usuarios}
                  renderRow={(u, idx) => (
                    <tr key={idx}>
                      <td>{u.id}</td>
                      <td>{u.nombre}</td>
                      <td>{u.rol}</td>
                    </tr>
                  )}
                />
              </Tab>
            </Tabs>

            <div className="text-center mt-4">
              <Button
                variant="success"
                className="px-4 rounded-pill shadow-sm"
                onClick={descargarPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" /> Generando PDF...
                  </>
                ) : (
                  "📥 Descargar Informe PDF"
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default PanelInformes;