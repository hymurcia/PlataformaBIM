// src/components/DetalleReporte.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Spinner,
  Badge,
  Card,
  ListGroup,
  Modal,
  Button,
  Row,
  Col,
  Container,
} from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

// Colores por estado
const estadoColores = {
  pendiente: "warning",
  pendiente_verificacion: "secondary",
  asignado: "primary",
  en_proceso: "info",
  resuelto: "success",
  rechazado: "danger",
};

const DetalleReporte = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

  // Cargar datos del reporte
  useEffect(() => {
    const fetchReporte = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return navigate("/login");

        const response = await axios.get(`${API_BASE_URL}/reportes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const imgResponse = await axios.get(
          `${API_BASE_URL}/reportes/${id}/imagenes`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setReporte(response.data);
        setImagenes(imgResponse.data);
      } catch (error) {
        console.error("Error al obtener el incidente:", error);
        if (error.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchReporte();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="text-center mt-5 fade-in">
        <Spinner animation="border" variant="success" />
        <p className="mt-2 text-muted">Cargando reporte...</p>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="text-center text-danger mt-5 fade-in">
        No se encontró el reporte.
      </div>
    );
  }

  const formatDate = (fecha) => {
    if (!fecha) return "No disponible";
    const d = new Date(fecha);
    return isNaN(d) ? "Fecha inválida" : d.toLocaleString();
  };

  const handleVerTareas = () => {
    const rol = parseInt(localStorage.getItem("rol"), 10);
    navigate(rol === 2 ? "/admin/tareas" : "/mis-tareas");
  };

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
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 1,
        }}
      ></div>

      <Container className="my-5" style={{ zIndex: 2 }}>
        <Card
          className="shadow border-0 fade-in"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255,255,255,0.95)",
          }}
        >
          <Card.Header
            className="text-center py-4 d-flex justify-content-between align-items-center"
            style={{
              backgroundColor: "#00482B",
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
            }}
          >
            <h3
              className="mb-0"
              style={{ color: "#FBE122", fontWeight: "bold" }}
            >
              {reporte.titulo || "Sin título"}
            </h3>
            <Button
              variant="light"
              size="sm"
              onClick={handleVerTareas}
              style={{
                borderRadius: "10px",
                fontWeight: "bold",
                backgroundColor: "#FBE122",
                color: "#00482B",
                border: "none",
              }}
            >
              📋 Ver mis tareas
            </Button>
          </Card.Header>

          <Card.Body className="p-4">
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Descripción:</strong> {reporte.descripcion || "No disponible"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Ubicación:</strong> {reporte.ubicacion_nombre || "No disponible"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Tipo:</strong>{" "}
                <Badge bg="secondary">{reporte.tipo || "No disponible"}</Badge>
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Gravedad:</strong>{" "}
                <Badge bg="dark">{reporte.gravedad || "No disponible"}</Badge>
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Estado:</strong>{" "}
                <Badge bg={estadoColores[reporte.estado] || "secondary"}>
                  {reporte.estado ? reporte.estado.toUpperCase() : "No disponible"}
                </Badge>
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Acciones Tomadas:</strong>{" "}
                {reporte.acciones_tomadas || "Ninguna"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Fecha de creación:</strong> {formatDate(reporte.fecha_creacion)}
              </ListGroup.Item>

              {reporte.fecha_asignacion && (
                <ListGroup.Item>
                  <strong>Asignado el:</strong> {formatDate(reporte.fecha_asignacion)}
                </ListGroup.Item>
              )}
              {reporte.fecha_cierre && (
                <ListGroup.Item>
                  <strong>Cerrado el:</strong> {formatDate(reporte.fecha_cierre)}
                </ListGroup.Item>
              )}

              <ListGroup.Item>
                <strong>Reportado por:</strong>{" "}
                {reporte.usuario_nombre
                  ? `${reporte.usuario_nombre} (${reporte.usuario_email})`
                  : "Invitado"}
              </ListGroup.Item>

              {/* Imágenes asociadas */}
              <ListGroup.Item>
                <strong>Imágenes asociadas:</strong>
                {imagenes.length > 0 ? (
                  <Row className="mt-3 g-3">
                    {imagenes.map((img) => {
                      const imgUrl = `${API_BASE_URL}/uploads/${img.url}`;
                      return (
                        <Col xs={6} md={4} lg={3} key={img.id} className="text-center">
                          <img
                            src={imgUrl}
                            alt={img.descripcion || "Imagen asociada"}
                            className="img-thumbnail reporte-imagen"
                            onClick={() => setPreviewImg(imgUrl)}
                            style={{
                              cursor: "pointer",
                              borderRadius: "10px",
                              transition: "transform 0.2s ease",
                            }}
                          />
                          {img.descripcion && (
                            <div className="small text-muted mt-1">
                              {img.descripcion}
                            </div>
                          )}
                        </Col>
                      );
                    })}
                  </Row>
                ) : (
                  <span className="ms-2 text-muted">No hay imágenes</span>
                )}
              </ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>
      </Container>

      {/* Modal vista previa */}
      <Modal show={!!previewImg} onHide={() => setPreviewImg(null)} centered size="lg">
        <Modal.Body className="text-center bg-dark">
          {previewImg && (
            <img
              src={previewImg}
              alt="Vista previa"
              className="img-fluid rounded shadow-lg"
            />
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-center">
          <Button
            variant="light"
            onClick={() => setPreviewImg(null)}
            style={{
              backgroundColor: "#FBE122",
              color: "#00482B",
              fontWeight: "bold",
              borderRadius: "10px",
              border: "none",
            }}
          >
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .fade-in {
          animation: fadeIn 0.6s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reporte-imagen:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default DetalleReporte;
