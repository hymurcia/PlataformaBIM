import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Card,
  Button,
  Form,
  Spinner,
  Row,
  Col,
  Badge,
  Modal,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import facatativa2 from "../assets/facatativa-2.jpg";

const SolicitudesAdquisicion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    item_solicitado: "",
    cantidad: "",
    justificacion: "",
  });
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchSolicitudes();
    fetchUser();
  }, []);

  // 🔹 Obtener usuario
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const res = await axios.get("http://localhost:5000/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (error) {
      console.error("Error al obtener usuario:", error);
    }
  };

  // 🔹 Obtener solicitudes
  const fetchSolicitudes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await axios.get("http://localhost:5000/solicitudes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSolicitudes(res.data);
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Crear solicitud
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/solicitudes",
        {
          ...formData,
          usuario_solicitante: `${user.nombre}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormData({ item_solicitado: "", cantidad: "", justificacion: "" });
      fetchSolicitudes();
      setSuccessMsg("Solicitud creada correctamente.");
      handleCloseModal();
    } catch (error) {
      console.error("Error al crear solicitud:", error.response?.data || error);
      setErrorMsg(error.response?.data?.error || "Error al crear solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔹 Modal control
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ item_solicitado: "", cantidad: "", justificacion: "" });
    setErrorMsg("");
  };

  // 🔹 Formatear fecha
  const formatFecha = (fecha) => new Date(fecha).toLocaleDateString();

  // 🔹 Estado badge
  const getEstadoVariant = (estado) => {
    switch (estado) {
      case "pendiente":
        return "warning";
      case "aprobado":
        return "success";
      case "rechazado":
        return "danger";
      default:
        return "secondary";
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" style={{ color: "#00482B" }} />
        <span className="ms-3">Cargando solicitudes...</span>
      </div>
    );

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        paddingTop: "50px",
        paddingBottom: "50px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 1,
        }}
      />
      <Container style={{ zIndex: 2 }}>
        <Row className="justify-content-center">
          <Col lg={10}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 style={{ color: "#FBE122", fontWeight: "bold" }}>
                Solicitudes de Adquisición
              </h2>
              <Button
                style={{
                  backgroundColor: "#FBE122",
                  borderColor: "#FBE122",
                  color: "#00482B",
                  fontWeight: "bold",
                }}
                onClick={handleShowModal}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Nueva Solicitud
              </Button>
            </div>

            {successMsg && <Alert variant="success">{successMsg}</Alert>}
            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

            <Card className="shadow-lg" style={{ borderRadius: "15px" }}>
              <Card.Header
                style={{
                  backgroundColor: "#00482B",
                  color: "#FBE122",
                  fontWeight: "bold",
                }}
              >
                Mis Solicitudes
              </Card.Header>
              <Card.Body style={{ backgroundColor: "rgba(255,255,255,0.9)" }}>
                {solicitudes.length === 0 ? (
                  <p className="text-muted text-center">
                    No hay solicitudes registradas.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead style={{ backgroundColor: "#00482B", color: "#FBE122" }}>
                        <tr>
                          <th>Item</th>
                          <th>Cantidad</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                          <th>Justificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitudes.map((s) => (
                          <tr key={s.id}>
                            <td>{s.item_solicitado}</td>
                            <td>{s.cantidad}</td>
                            <td>
                              <Badge
                                bg={getEstadoVariant(s.estado_solicitud)}
                                style={{ textTransform: "capitalize" }}
                              >
                                {s.estado_solicitud}
                              </Badge>
                            </td>
                            <td>{formatFecha(s.fecha_solicitud)}</td>
                            <td>{s.justificacion || "Sin justificación"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton style={{ backgroundColor: "#00482B" }}>
            <Modal.Title style={{ color: "#FBE122" }}>Nueva Solicitud</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreate}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Item *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.item_solicitado}
                  onChange={(e) =>
                    setFormData({ ...formData, item_solicitado: e.target.value })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={(e) =>
                    setFormData({ ...formData, cantidad: e.target.value })
                  }
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Justificación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.justificacion}
                  onChange={(e) =>
                    setFormData({ ...formData, justificacion: e.target.value })
                  }
                />
              </Form.Group>
              {errorMsg && (
                <Alert variant="danger" className="mt-2">
                  {errorMsg}
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                style={{
                  backgroundColor: "#FBE122",
                  borderColor: "#FBE122",
                  color: "#00482B",
                  fontWeight: "bold",
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                ) : (
                  "Crear Solicitud"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default SolicitudesAdquisicion;
