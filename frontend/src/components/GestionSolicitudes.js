import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Card,
  Button,
  Row,
  Col,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form
} from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

const GestionSolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const API_BASE_URL = "http://localhost:5000";
  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchSolicitudes(); }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true); setErrorMsg(null); setSuccessMsg(null);
      const res = await axios.get(`${API_BASE_URL}/solicitudes`, { headers });
      setSolicitudes(res.data);
    } catch {
      setErrorMsg("No se pudieron cargar las solicitudes. Intente de nuevo.");
    } finally { setLoading(false); }
  };

  const aprobarSolicitud = async (id) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/solicitudes/${id}/aprobar`, {}, { headers });
      if (res.data.pdfUrl) window.open(`${API_BASE_URL}${res.data.pdfUrl}`, "_blank");
      setSuccessMsg("Solicitud aprobada exitosamente."); fetchSolicitudes();
    } catch { setErrorMsg("No se pudo aprobar la solicitud."); }
  };

  const regenerarPDF = async (id) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/solicitudes/${id}/regenerar-pdf`, {}, { headers });
      if (res.data.pdfUrl) window.open(`${API_BASE_URL}${res.data.pdfUrl}`, "_blank");
      setSuccessMsg("PDF regenerado exitosamente.");
    } catch { setErrorMsg("No se pudo regenerar el PDF."); }
  };

  const rechazarSolicitud = async (id, motivo = "") => {
    try {
      await axios.put(`${API_BASE_URL}/solicitudes/${id}/rechazar`, { motivo }, { headers });
      setSuccessMsg("Solicitud rechazada exitosamente."); setShowDetallesModal(false); setMotivoRechazo("");
      setSolicitudes(prev => prev.filter(s => s.id !== id));
    } catch { setErrorMsg("No se pudo rechazar la solicitud."); }
  };

  const verDetalles = (solicitud) => { setSolicitudSeleccionada(solicitud); setShowDetallesModal(true); };
  const getEstadoVariant = (estado) => ({ aprobada: "success", rechazada: "danger", pendiente: "warning" }[estado] || "secondary");
  const formatFecha = (fecha) => new Date(fecha).toLocaleDateString("es-ES", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });

  if (loading) return <div className="d-flex justify-content-center my-5"><Spinner animation="border" variant="warning" /></div>;

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 style={{ color:"#FBE122", fontWeight:"bold" }}>📥 Gestión de Solicitudes</h2>
          <Button variant="warning" onClick={fetchSolicitudes}><i className="bi bi-arrow-clockwise me-2"></i>Actualizar</Button>
        </div>

        {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
        {errorMsg && <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}
        {solicitudes.length === 0 && <Alert variant="info"><i className="bi bi-info-circle me-2"></i>No hay solicitudes registradas.</Alert>}

        <Row>
          {solicitudes.map(s => (
            <Col key={s.id} lg={6} className="mb-3">
              <Card style={{ backgroundColor:"rgba(0,0,0,0.7)", color:"#FBE122" }} className="h-100 shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <Badge bg={getEstadoVariant(s.estado_solicitud)}>{s.estado_solicitud.toUpperCase()}</Badge>
                  <small className="text-muted">{formatFecha(s.fecha_solicitud)}</small>
                </Card.Header>
                <Card.Body style={{ fontSize:"0.9rem", lineHeight:"1.2rem" }}>
                  <div><strong>Solicitante:</strong> {s.usuario_solicitante}</div>
                  <div><strong>Item:</strong> {s.item_solicitado} {s.cantidad && `(${s.cantidad})`}</div>
                  {s.justificacion && <div className="text-muted"><strong>Justificación:</strong> {s.justificacion}</div>}
                  {s.motivo_rechazo && <div className="text-danger"><strong>Motivo rechazo:</strong> {s.motivo_rechazo}</div>}
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between flex-wrap">
                  <Button variant="outline-warning" size="sm" className="mb-1" onClick={() => verDetalles(s)}><i className="bi bi-eye me-1"></i>Detalles</Button>
                  {s.estado_solicitud==="pendiente" && (
                    <>
                      <Button variant="success" size="sm" className="me-1 mb-1" onClick={() => aprobarSolicitud(s.id)}><i className="bi bi-check-lg me-1"></i>Aprobar</Button>
                      <Button variant="danger" size="sm" className="mb-1" onClick={() => verDetalles(s)}><i className="bi bi-x-lg me-1"></i>Rechazar</Button>
                    </>
                  )}
                  {s.estado_solicitud==="aprobada" && <Button variant="outline-secondary" size="sm" className="mb-1" onClick={() => regenerarPDF(s.id)}><i className="bi bi-file-earmark-pdf me-1"></i>PDF</Button>}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>

        <Modal show={showDetallesModal} onHide={() => setShowDetallesModal(false)}>
          <Modal.Header closeButton><Modal.Title>Detalles de la Solicitud</Modal.Title></Modal.Header>
          <Modal.Body>
            {solicitudSeleccionada && (
              <>
                <Row className="mb-2"><Col sm={4}><strong>Solicitante:</strong></Col><Col sm={8}>{solicitudSeleccionada.usuario_solicitante}</Col></Row>
                <Row className="mb-2"><Col sm={4}><strong>Item:</strong></Col><Col sm={8}>{solicitudSeleccionada.item_solicitado}</Col></Row>
                <Row className="mb-2"><Col sm={4}><strong>Cantidad:</strong></Col><Col sm={8}>{solicitudSeleccionada.cantidad}</Col></Row>
                <Row className="mb-2"><Col sm={4}><strong>Fecha:</strong></Col><Col sm={8}>{formatFecha(solicitudSeleccionada.fecha_solicitud)}</Col></Row>
                <Row className="mb-2"><Col sm={4}><strong>Estado:</strong></Col><Col sm={8}><Badge bg={getEstadoVariant(solicitudSeleccionada.estado_solicitud)}>{solicitudSeleccionada.estado_solicitud.toUpperCase()}</Badge></Col></Row>
                {solicitudSeleccionada.justificacion && <Row className="mb-2"><Col sm={4}><strong>Justificación:</strong></Col><Col sm={8}>{solicitudSeleccionada.justificacion}</Col></Row>}
                {solicitudSeleccionada.estado_solicitud==="pendiente" && (
                  <Form.Group className="mb-2">
                    <Form.Label><strong>Motivo de rechazo:</strong></Form.Label>
                    <Form.Control as="textarea" rows={2} value={motivoRechazo} onChange={(e)=>setMotivoRechazo(e.target.value)} />
                  </Form.Group>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetallesModal(false)}>Cerrar</Button>
            {solicitudSeleccionada?.estado_solicitud==="pendiente" && <Button variant="danger" onClick={()=>rechazarSolicitud(solicitudSeleccionada.id, motivoRechazo)}>Rechazar</Button>}
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default GestionSolicitudes;
