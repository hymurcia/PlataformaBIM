// src/components/SolicitudesAdquisicion.js
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

  // 🔹 Obtener usuario autenticado
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

  // 🔹 Obtener solicitudes del usuario
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
      setSuccessMsg("✅ Solicitud creada correctamente.");
      handleCloseModal();
    } catch (error) {
      console.error("Error al crear solicitud:", error.response?.data || error);
      setErrorMsg(error.response?.data?.error || "Error al crear la solicitud.");
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
  const formatFecha = (fecha) =>
    new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // 🔹 Estilo personalizado para los estados
  const getEstadoEstilo = (estado) => {
    if (!estado) return {};
    const baseStyle = {
      color: "white",
      fontWeight: "bold",
      padding: "6px 12px",
      borderRadius: "8px",
      textTransform: "capitalize",
      display: "inline-block",
      textAlign: "center",
      minWidth: "100px",
    };

    switch (estado.toLowerCase()) {
      case "pendiente":
        return { ...baseStyle, backgroundColor: "#f0ad4e" }; // Amarillo
      case "aprobada":
        return { ...baseStyle, backgroundColor: "#28a745" }; // Verde
      case "rechazada":
        return { ...baseStyle, backgroundColor: "#dc3545" }; // Rojo
      default:
        return { ...baseStyle, backgroundColor: "#6c757d" }; // Gris
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 text-white bg-dark">
        <Spinner animation="border" variant="light" />
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
        paddingTop: "60px",
        paddingBottom: "60px",
      }}
    >
      {/* Fondo oscuro translúcido */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.45)",
          zIndex: 1,
        }}
      />

      <Container style={{ zIndex: 2 }}>
        <Row className="justify-content-center">
          <Col lg={10}>
            <Card
              className="shadow-lg border-0"
              style={{ borderRadius: "18px", overflow: "hidden" }}
            >
              <Card.Header
                className="d-flex justify-content-between align-items-center"
                style={{
                  backgroundColor: "#00482B",
                  color: "#FBE122",
                  fontWeight: "bold",
                  fontSize: "1.3rem",
                }}
              >
                Solicitudes de Adquisición
                <Button
                  onClick={handleShowModal}
                  style={{
                    backgroundColor: "#FBE122",
                    borderColor: "#FBE122",
                    color: "#00482B",
                    fontWeight: "bold",
                  }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Nueva Solicitud
                </Button>
              </Card.Header>

              <Card.Body style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
                {successMsg && (
                  <Alert variant="success" className="text-center fw-bold">
                    {successMsg}
                  </Alert>
                )}
                {errorMsg && (
                  <Alert variant="danger" className="text-center fw-bold">
                    {errorMsg}
                  </Alert>
                )}

                {solicitudes.length === 0 ? (
                  <p className="text-muted text-center mb-0">
                    No hay solicitudes registradas.
                  </p>
                ) : (
                  <div className="table-responsive mt-3">
                    <table className="table table-hover align-middle">
                      <thead
                        style={{
                          backgroundColor: "#00482B",
                          color: "#FBE122",
                        }}
                      >
                        <tr>
                          <th>Item Solicitado</th>
                          <th>Cantidad</th>
                          <th>Estado</th>
                          <th>Fecha</th>
                          <th>Justificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solicitudes.map((s) => (
                          <tr key={s.id}>
                            <td className="fw-bold">{s.item_solicitado}</td>
                            <td>{s.cantidad}</td>
                            <td>
                              <span style={getEstadoEstilo(s.estado_solicitud)}>
                                {s.estado_solicitud}
                              </span>
                            </td>
                            <td>{formatFecha(s.fecha_solicitud)}</td>
                            <td>
                              {s.justificacion ? (
                                <span>{s.justificacion}</span>
                              ) : (
                                <em className="text-muted">
                                  Sin justificación
                                </em>
                              )}
                            </td>
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

        {/* 🔹 Modal de nueva solicitud */}
        <Modal
          show={showModal}
          onHide={handleCloseModal}
          centered
          backdrop="static"
        >
          <Modal.Header
            closeButton
            style={{
              backgroundColor: "#00482B",
              color: "#FBE122",
            }}
          >
            <Modal.Title>Nueva Solicitud</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreate}>
            <Modal.Body style={{ backgroundColor: "#f8f9fa" }}>
              <Form.Group className="mb-3">
                <Form.Label>Item *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Computador portátil"
                  value={formData.item_solicitado}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      item_solicitado: e.target.value,
                    })
                  }
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Cantidad *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="Ej: 5"
                  value={formData.cantidad}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cantidad: e.target.value,
                    })
                  }
                  required
                />
              </Form.Group>

              <Form.Group>
                <Form.Label>Justificación</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Describe brevemente la necesidad de este recurso..."
                  value={formData.justificacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      justificacion: e.target.value,
                    })
                  }
                />
              </Form.Group>

              {errorMsg && (
                <Alert variant="danger" className="mt-3">
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
