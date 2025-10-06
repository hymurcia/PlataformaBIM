// src/components/DetalleReporte.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Spinner, Badge, Card, ListGroup, Modal, Button } from "react-bootstrap";

// 🎯 URL base configurable desde entorno
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

// 🎨 Colores por estado del reporte
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

  // Estados locales
  const [reporte, setReporte] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

  // 🔹 Cargar datos del reporte e imágenes
  useEffect(() => {
    const fetchReporte = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        // Obtener datos del reporte
        const response = await axios.get(`${API_BASE_URL}/reportes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Obtener imágenes del reporte
        const imgResponse = await axios.get(
          `${API_BASE_URL}/reportes/${id}/imagenes`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setReporte(response.data);
        setImagenes(imgResponse.data);
      } catch (error) {
        console.error("❌ Error al obtener el incidente:", error);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReporte();
  }, [id, navigate]);

  // 🔹 Spinner de carga
  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando reporte...</p>
      </div>
    );
  }

  // 🔹 Si no hay reporte
  if (!reporte) {
    return (
      <div className="text-center text-danger mt-5">
        No se encontró el reporte.
      </div>
    );
  }

  // 🔹 Formatear fechas
  const formatDate = (fecha) => {
    if (!fecha) return "No disponible";
    const d = new Date(fecha);
    return isNaN(d) ? "Fecha inválida" : d.toLocaleString();
  };

  // 🔹 Redirección según el rol
  const handleVerTareas = () => {
    const rolGuardado = parseInt(localStorage.getItem("rol"), 10);

    if (rolGuardado === 2) {
      navigate("/admin/tareas");
    } else {
      navigate("/mis-tareas");
    }
  };

  return (
    <div className="container mt-5">
      <Card className="shadow-lg">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">{reporte.titulo || "Sin título"}</h4>

          {/* 🔹 Botón que cambia según el rol */}
          <Button variant="light" onClick={handleVerTareas}>
            📋 Ver mis tareas
          </Button>
        </Card.Header>

        <Card.Body>
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

            {/* 🔹 Imágenes asociadas */}
            <ListGroup.Item>
              <strong>Imágenes asociadas:</strong>
              {imagenes.length > 0 ? (
                <div className="d-flex flex-wrap gap-3 mt-2">
                  {imagenes.map((img) => {
                    const imgUrl = `${API_BASE_URL}/uploads/${img.url}`;
                    return (
                      <div key={img.id} className="text-center">
                        <img
                          src={imgUrl}
                          alt={img.descripcion || "Imagen asociada"}
                          style={{
                            maxWidth: "150px",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                          onClick={() => setPreviewImg(imgUrl)}
                        />
                        {img.descripcion && (
                          <div className="small text-muted mt-1">{img.descripcion}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="ms-2">No hay imágenes</span>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Card.Body>
      </Card>

      {/* 🔹 Modal de vista previa */}
      <Modal show={!!previewImg} onHide={() => setPreviewImg(null)} centered size="lg">
        <Modal.Body className="text-center">
          {previewImg && (
            <img src={previewImg} alt="Vista previa" style={{ width: "100%", borderRadius: "10px" }} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DetalleReporte;
