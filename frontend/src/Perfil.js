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
import facatativa2 from "./assets/facatativa-2.jpg"; // Imagen de fondo
import escudoColor from "./assets/ESCUDO COLOR.png"; // Escudo de la universidad

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
        <Spinner animation="border" style={{ color: "#00482B" }} />
        <span className="ms-2" style={{ color: "#00482B" }}>
          Cargando perfil...
        </span>
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
      {/* Capa de oscurecimiento */}
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
      ></div>

      <Container className="my-5" style={{ zIndex: 2 }}>
        <Row className="justify-content-center">
          <Col md={8}>
            <Card
              className="shadow-lg border-0"
              style={{
                borderRadius: "15px",
                backgroundColor: "rgba(255, 255, 255, 0.85)",
              }}
            >
              <Card.Header
                className="text-white text-center py-4"
                style={{
                  backgroundColor: "#00482B",
                  borderTopLeftRadius: "15px",
                  borderTopRightRadius: "15px",
                }}
              >
                <img
                  src={escudoColor}
                  alt="Escudo de la Universidad"
                  style={{ height: "60px", marginBottom: "10px" }}
                />
                <h3
                  className="mb-0"
                  style={{ color: "#FBE122", fontWeight: "bold" }}
                >
                  Perfil de Usuario
                </h3>
              </Card.Header>

              <Card.Body className="p-4">
                {userData ? (
                  <>
                    {/* Información del usuario */}
                    <div className="mb-4">
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
                            pill
                            style={{
                              backgroundColor:
                                userData.rol_nombre === "Administrador"
                                  ? "#FBE122"
                                  : "#00482B",
                              color:
                                userData.rol_nombre === "Administrador"
                                  ? "#00482B"
                                  : "white",
                            }}
                          >
                            {userData.rol_nombre}
                          </Badge>
                        </Col>
                      </Row>
                    </div>

                    {/* Panel Administrador */}
                    {auth.user?.rol_id === 1 && (
                      <Card
                        className="mb-4 shadow-sm"
                        style={{
                          borderRadius: "10px",
                          backgroundColor: "rgba(255, 255, 255, 0.6)",
                        }}
                      >
                        <Card.Body>
                          <h5
                            className="mb-3"
                            style={{
                              color: "#00482B",
                              fontWeight: "bold",
                            }}
                          >
                            Panel de Administrador
                          </h5>
                          <Button
                            style={{
                              backgroundColor: "#FBE122",
                              borderColor: "#FBE122",
                              color: "#00482B",
                            }}
                            className="me-2 mb-2"
                            onClick={() => navigate("/admin/usuarios")}
                          >
                            Gestionar Usuarios
                          </Button>
                          <Button
                            variant="warning"
                            className="mb-2"
                            onClick={() => navigate("/logs")}
                          >
                            Ver Logs Usuarios
                          </Button>
                        </Card.Body>
                      </Card>
                    )}

                    {/* Botón de Cerrar sesión */}
                    <div className="d-flex justify-content-end mt-4">
                      <Button
                        variant="danger"
                        onClick={handleLogout}
                        style={{ fontWeight: "bold" }}
                      >
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
    </div>
  );
};

export default Perfil;
