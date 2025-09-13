// src/Perfil.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  Button,
  Spinner,
  Row,
  Col,
  Badge,
} from "react-bootstrap";

const Perfil = ({ auth, setAuth }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get("http://localhost:5000/perfil", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserData(response.data);

        // 🔹 Guardar en localStorage para usar en Socket.IO
        localStorage.setItem("usuario_id", response.data.id);

        // 🔹 Actualizar el estado global de autenticación
        setAuth({
          isAuthenticated: true,
          user: response.data,
        });
      } catch (err) {
        console.error("Error al cargar perfil:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("usuario_id");
        setAuth({ isAuthenticated: false, user: null });
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, setAuth]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario_id");
    setAuth({ isAuthenticated: false, user: null });
    navigate("/");
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando perfil...</span>
      </div>
    );

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">Perfil de Usuario</h3>
            </Card.Header>
            <Card.Body>
              {userData ? (
                <>
                  <Row className="mb-3">
                    <Col sm={4}>
                      <strong>ID:</strong>
                    </Col>
                    <Col sm={8}>{userData.id}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4}>
                      <strong>Nombre:</strong>
                    </Col>
                    <Col sm={8}>{userData.nombre}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4}>
                      <strong>Email:</strong>
                    </Col>
                    <Col sm={8}>{userData.email}</Col>
                  </Row>
                  <Row className="mb-3">
                    <Col sm={4}>
                      <strong>Rol:</strong>
                    </Col>
                    <Col sm={8}>
                      <Badge
                        bg={
                          userData.rol_nombre === "Administrador"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {userData.rol_nombre}
                      </Badge>
                    </Col>
                  </Row>

                  {/* Panel Administrador */}
                  {auth.user?.rol_id === 1 && (
                    <Card className="bg-light mb-3 shadow-sm">
                      <Card.Body>
                        <h5 className="mb-3 text-primary">
                          Panel de Administrador
                        </h5>
                        <Button
                          variant="primary"
                          className="me-2 mb-2"
                          onClick={() => navigate("/admin/usuarios")}
                        >
                          Gestionar Usuarios
                        </Button>
                        <Button
                          variant="warning"
                          className="mb-2"
                          onClick={() => navigate("/roles")}
                        >
                          Gestionar Roles
                        </Button>
                      </Card.Body>
                    </Card>
                  )}

                  <div className="d-flex justify-content-end">
                    <Button variant="danger" onClick={handleLogout}>
                      Cerrar sesión
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted">
                  No se pudo cargar la información del perfil.
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Perfil;
