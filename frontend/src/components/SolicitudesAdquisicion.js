import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container, Card, Button, Form, Spinner, Row, Col, Badge
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const SolicitudesAdquisicion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ item_solicitado: "", cantidad: "" });
  const [user, setUser] = useState(null); // 👈 aquí guardamos perfil del usuario

  const navigate = useNavigate();

  useEffect(() => {
    fetchSolicitudes();
    fetchUser(); // 👈 también traemos el perfil del usuario
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
    try {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        navigate("/login");
        return;
      }

      await axios.post(
        "http://localhost:5000/solicitudes",
        {
          ...formData,
          usuario_solicitante: `${user.nombre}`, // 👈 aquí enviamos el nombre
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFormData({ item_solicitado: "", cantidad: "" });
      fetchSolicitudes();
    } catch (error) {
      console.error("Error al crear solicitud:", error.response?.data || error);
      alert(error.response?.data?.error || "Error al crear solicitud");
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando solicitudes...</span>
      </div>
    );

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">Solicitudes de Adquisición</h3>
            </Card.Header>
            <Card.Body>
              {/* Formulario */}
              <Form onSubmit={handleCreate} className="mb-4">
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Item solicitado"
                      value={formData.item_solicitado}
                      onChange={(e) =>
                        setFormData({ ...formData, item_solicitado: e.target.value })
                      }
                      required
                    />
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Control
                      type="number"
                      placeholder="Cantidad"
                      value={formData.cantidad}
                      onChange={(e) =>
                        setFormData({ ...formData, cantidad: e.target.value })
                      }
                      required
                    />
                  </Col>
                </Row>
                <Button type="submit" variant="success">
                  Crear Solicitud
                </Button>
              </Form>

              {/* Listado */}
              {solicitudes.length === 0 ? (
                <p className="text-muted text-center">No hay solicitudes registradas.</p>
              ) : (
                solicitudes.map((s) => (
                  <Card key={s.id} className="mb-3 shadow-sm border-0">
                    <Card.Body>
                      <Row>
                        <Col md={4}><strong>{s.usuario_solicitante}</strong></Col>
                        <Col md={4}>{s.item_solicitado} ({s.cantidad})</Col>
                        <Col md={4} className="text-end">
                          <Badge
                            bg={
                              s.estado_solicitud === "aprobada"
                                ? "success"
                                : s.estado_solicitud === "rechazada"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {s.estado_solicitud}
                          </Badge>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SolicitudesAdquisicion;
