import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Spinner,
  Table,
  Button,
  Modal,
  Row,
  Col,
  Badge,
  Form,
  Card,
  Container,
} from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg"; // Ajusta ruta si es necesario

// 🌎 URL base del backend
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

// 🎨 Colores por frecuencia y estado
const frecuenciaColores = {
  Diario: "info",
  Semanal: "primary",
  Mensual: "secondary",
  Trimestral: "warning",
  Anual: "success",
};

const estadoColores = {
  pendiente: "danger", // 🔴 rojo
  completado: "success", // 🟢 verde
  en_progreso: "primary",
  cancelado: "secondary",
};

const Mantenimientos = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [componentes, setComponentes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    descripcion: '',
    frecuencia: '',
    fecha_programada: '',
    operario_id: '',
    componente_id: '',
    ubicacion_id: '',
    dias: '',
    comentarios: ''
  });

  // Modales
  const [showModalView, setShowModalView] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [showModalReprogramar, setShowModalReprogramar] = useState(false);

  // Datos de modales
  const [viewData, setViewData] = useState(null);
  const [editData, setEditData] = useState(null);
  const [reprogramarData, setReprogramarData] = useState(null);

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroFrecuencia, setFiltroFrecuencia] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // 📦 Cargar datos del backend
  useEffect(() => {
    obtenerDatos();
  }, []);

  const obtenerDatos = async () => {
    try {
      setLoading(true);
      const [resM, resR, resC, resU] = await Promise.all([
        axios.get(`${API_BASE_URL}/mantenimientos`, { headers }),
        axios.get(`${API_BASE_URL}/asignaciones/responsables`, { headers }),
        axios.get(`${API_BASE_URL}/componentes`, { headers }),
        axios.get(`${API_BASE_URL}/ubicaciones`, { headers }),
      ]);

      setMantenimientos(resM.data || []);
      setResponsables(resR.data || []);
      setComponentes(resC.data || []);
      setUbicaciones(resU.data || []);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("❌ Error al obtener los datos de mantenimiento.");
    } finally {
      setLoading(false);
    }
  };

  // 📅 Formatear fechas
  const formatDate = (fecha) => {
    if (!fecha) return "No registrada";
    const d = new Date(fecha);
    if (isNaN(d)) return "Fecha inválida";
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // 🔁 Calcular próxima fecha según frecuencia
  const calcularProximaFecha = (m) => {
    if (!m) return null;
    if (m.fecha_programada) return new Date(m.fecha_programada);
    if (!m.fecha_ultima_ejecucion || !m.frecuencia) return null;

    let fecha = new Date(m.fecha_ultima_ejecucion);
    switch ((m.frecuencia || "").toLowerCase()) {
      case "diario":
        fecha.setDate(fecha.getDate() + 1);
        break;
      case "semanal":
        fecha.setDate(fecha.getDate() + 7);
        break;
      case "mensual":
        fecha.setMonth(fecha.getMonth() + 1);
        break;
      case "trimestral":
        fecha.setMonth(fecha.getMonth() + 3);
        break;
      case "anual":
        fecha.setFullYear(fecha.getFullYear() + 1);
        break;
      default:
        return null;
    }
    return fecha;
  };

  // ⏱️ Verificar si el mantenimiento está a tiempo o retrasado
  const verificarEstadoTiempo = (m) => {
    const proxima = calcularProximaFecha(m);
    if (!proxima) return <Badge bg="secondary">No definida</Badge>;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return proxima >= hoy ? (
      <Badge bg="success">A tiempo ✅</Badge>
    ) : (
      <Badge bg="danger">Retrasado ❌</Badge>
    );
  };

  const obtenerNombreComponente = (id) => {
    const c = componentes.find((x) => x.id === id);
    return c ? c.nombre : "Sin componente";
  };

  const obtenerNombreUbicacion = (id) => {
    const u = ubicaciones.find((x) => x.id === id);
    return u ? u.nombre : "Sin ubicación";
  };

  // 🧭 Acciones (ver, editar, reprogramar)
  const abrirModalVer = (m) => {
    setViewData(m);
    setShowModalView(true);
  };

  const abrirModalEditar = (m) => {
    setEditData({
      ...m,
      fecha_programada: m.fecha_programada
        ? m.fecha_programada.split("T")[0]
        : "",
    });
    setShowModalEdit(true);
  };

  const abrirModalReprogramar = (m) => {
    setReprogramarData({
      id: m.id,
      fecha_programada: m.fecha_programada
        ? m.fecha_programada.split("T")[0]
        : "",
    });
    setShowModalReprogramar(true);
  };

  // 💾 Guardar edición
  const guardarEdicion = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/mantenimientos/${editData.id}`,
        editData,
        { headers }
      );
      setShowModalEdit(false);
      obtenerDatos();
    } catch (error) {
      console.error(error);
      alert("❌ Error al actualizar el mantenimiento.");
    }
  };

  // 💾 Guardar reprogramación
  const guardarReprogramacion = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/mantenimientos/${reprogramarData.id}/reprogramar`,
        reprogramarData,
        { headers }
      );
      setShowModalReprogramar(false);
      obtenerDatos();
    } catch (error) {
      console.error(error);
      alert("❌ Error al reprogramar mantenimiento.");
    }
  };

  // 🗑️ Eliminar mantenimiento
  const eliminarMantenimiento = async (id) => {
    if (!window.confirm("¿Eliminar este mantenimiento?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/mantenimientos/${id}`, { headers });
      obtenerDatos();
    } catch (error) {
      console.error(error);
      alert("❌ Error al eliminar mantenimiento.");
    }
  };

  // 🔍 Filtrado
  const mantenimientosFiltrados = mantenimientos.filter((m) => {
    const nombreOK =
      !filtroNombre ||
      (m.nombre || "").toLowerCase().includes(filtroNombre.toLowerCase());
    const frecuenciaOK =
      !filtroFrecuencia || m.frecuencia === filtroFrecuencia;
    const estadoOK = !filtroEstado || m.estado === filtroEstado;
    const responsableOK =
      !filtroResponsable ||
      `${m.responsable_nombre || ""} ${m.responsable_apellido || ""}`
        .toLowerCase()
        .includes(filtroResponsable.toLowerCase());
    const ubicacionOK =
      !filtroUbicacion ||
      obtenerNombreUbicacion(m.ubicacion_id)
        .toLowerCase()
        .includes(filtroUbicacion.toLowerCase());
    return nombreOK && frecuenciaOK && estadoOK && responsableOK && ubicacionOK;
  });

  if (loading)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="success" />
        <p className="mt-2 text-success">Cargando mantenimientos...</p>
      </div>
    );

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
      {/* 🔲 Capa semitransparente */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 1,
        }}
      ></div>

      <Container className="my-5" style={{ zIndex: 2 }}>
        <Card
          className="shadow-lg border-0"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
          }}
        >
          <Card.Header
            className="text-white py-3"
            style={{
              backgroundColor: "#00482B",
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
            }}
          >
            <h2 style={{ margin: 0, color: "#FBE122", fontWeight: "bold" }}>
              🛠️ Gestión de Mantenimientos
            </h2>
          </Card.Header>

          <Card.Body>
            {/* 🔍 Filtros */}
            <Row className="mb-4 g-2">
              <Col md={3}>
                <Form.Control
                  placeholder="🔍 Buscar por nombre"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                />
              </Col>
              <Col md={2}>
                <Form.Select
                  value={filtroFrecuencia}
                  onChange={(e) => setFiltroFrecuencia(e.target.value)}
                >
                  <option value="">Frecuencia</option>
                  {Object.keys(frecuenciaColores).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Estado</option>
                  {Object.keys(estadoColores).map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Control
                  placeholder="Responsable"
                  value={filtroResponsable}
                  onChange={(e) => setFiltroResponsable(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Control
                  placeholder="Ubicación"
                  value={filtroUbicacion}
                  onChange={(e) => setFiltroUbicacion(e.target.value)}
                />
              </Col>
            </Row>

            {/* 🧾 Tabla */}
            <div className="table-responsive">
              <Table striped bordered hover responsive className="align-middle text-center">
                <thead
                  style={{ backgroundColor: "#00482B", color: "#FBE122" }}
                >
                  <tr>
                    <th>Nombre</th>
                    <th>Frecuencia</th>
                    <th>Última ejecución</th>
                    <th>Próxima</th>
                    <th>Estado tiempo</th>
                    <th>Componente</th>
                    <th>Ubicación</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientosFiltrados.map((m) => {
                    const proxima = calcularProximaFecha(m);
                    return (
                      <tr key={m.id}>
                        <td>{m.nombre}</td>
                        <td>
                          <Badge
                            bg={frecuenciaColores[m.frecuencia] || "secondary"}
                          >
                            {m.frecuencia}
                          </Badge>
                        </td>
                        <td>{formatDate(m.fecha_ultima_ejecucion)}</td>
                        <td>{proxima ? formatDate(proxima) : "—"}</td>
                        <td>{verificarEstadoTiempo(m)}</td>
                        <td>{obtenerNombreComponente(m.componente_id)}</td>
                        <td>{obtenerNombreUbicacion(m.ubicacion_id)}</td>
                        <td>
                          {m.responsable_nombre
                            ? `${m.responsable_nombre} ${m.responsable_apellido || ""}`
                            : "No asignado"}
                        </td>
                        <td>
                          <Badge bg={estadoColores[m.estado] || "secondary"}>
                            {m.estado}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2 justify-content-center">
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => abrirModalVer(m)}
                            >
                              👁️ Ver
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => abrirModalEditar(m)}
                            >
                              ✏️ Editar
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => abrirModalReprogramar(m)}
                            >
                              ⏰ Reprogramar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => eliminarMantenimiento(m.id)}
                            >
                              🗑️ Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </Container>

      {/* Modal Ver */}
      <Modal show={showModalView} onHide={() => setShowModalView(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: "#00482B", color: "#fff" }}>
          <Modal.Title>📋 Detalles del Mantenimiento</Modal.Title>
        </Modal.Header>
        {viewData && (
          <Modal.Body>
            <Row>
              <Col md={6}>
                <p><strong>Nombre:</strong> {viewData.nombre}</p>
                <p><strong>Frecuencia:</strong> {viewData.frecuencia}</p>
                <p><strong>Estado:</strong> {viewData.estado}</p>
                <p><strong>Descripción:</strong> {viewData.descripcion || "—"}</p>
              </Col>
              <Col md={6}>
                <p><strong>Ubicación:</strong> {obtenerNombreUbicacion(viewData.ubicacion_id)}</p>
                <p><strong>Componente:</strong> {obtenerNombreComponente(viewData.componente_id)}</p>
                <p><strong>Última ejecución:</strong> {formatDate(viewData.fecha_ultima_ejecucion)}</p>
                <p><strong>Próxima ejecución:</strong> {formatDate(calcularProximaFecha(viewData))}</p>
              </Col>
            </Row>
          </Modal.Body>
        )}
        <Modal.Footer><Button variant="secondary" onClick={() => setShowModalView(false)}>Cerrar</Button></Modal.Footer>
      </Modal>

       {/* Modal Editar */}
      <Modal show={showModalEdit} onHide={() => setShowModalEdit(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: "#00482B", color: "#fff" }}>
          <Modal.Title>✏️ Editar Mantenimiento</Modal.Title>
        </Modal.Header>
        {editData && (
          <Modal.Body>
            <Form>
              <Row className="g-2">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control value={editData.nombre} onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Frecuencia</Form.Label>
                    <Form.Select value={editData.frecuencia} onChange={(e) => setEditData({ ...editData, frecuencia: e.target.value })}>
                      {Object.keys(frecuenciaColores).map((f) => <option key={f}>{f}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-2">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estado</Form.Label>
                    <Form.Select value={editData.estado} onChange={(e) => setEditData({ ...editData, estado: e.target.value })}>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En progreso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Fecha Programada</Form.Label>
                    <Form.Control type="date" value={editData.fecha_programada || ""} onChange={(e) => setEditData({ ...editData, fecha_programada: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-2">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Responsable</Form.Label>
                    <Form.Select value={editData.operario_id || ""} onChange={(e) => setEditData({ ...editData, operario_id: Number(e.target.value) })}>
                      <option value="">Seleccione responsable</option>
                      {responsables.map((r) => <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group>
                <Form.Label>Descripción</Form.Label>
                <Form.Control as="textarea" rows={3} value={editData.descripcion || ""} onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })} />
              </Form.Group>
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEdit(false)}>Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicion}>Guardar cambios</Button>
        </Modal.Footer>
      </Modal>


      {/* Modal Reprogramar */}
      <Modal
        show={showModalReprogramar}
        onHide={() => setShowModalReprogramar(false)}
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: "#00482B", color: "#fff" }}>
          <Modal.Title>⏰ Reprogramar Mantenimiento</Modal.Title>
        </Modal.Header>
        {reprogramarData && (
          <Modal.Body>
            <Form>
              <Form.Group>
                <Form.Label>Nueva fecha</Form.Label>
                <Form.Control
                  type="date"
                  value={reprogramarData.fecha_programada || ""}
                  onChange={(e) =>
                    setReprogramarData({
                      ...reprogramarData,
                      fecha_programada: e.target.value,
                    })
                  }
                />
              </Form.Group>
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModalReprogramar(false)}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={guardarReprogramacion}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Mantenimientos;
