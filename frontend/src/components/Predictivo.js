import React, { useEffect, useState } from "react";
import { Container, Card, Table, Spinner, Badge } from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

// 🌎 URL base del backend
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const Predictivo = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Obtener datos del backend
  useEffect(() => {
    const fetchMantenimientos = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/predictivo/mantenimiento`);
        const data = await resp.json();
        if (data.error) {
          setError(data.error);
        } else if (data.mantenimientos) {
          setMantenimientos(data.mantenimientos);
        }
      } catch (err) {
        console.error(err);
        setError("Error al consultar el módulo predictivo");
      } finally {
        setLoading(false);
      }
    };

    fetchMantenimientos();
  }, []);

  // 📅 Formatear fechas
  const formatDate = (fecha) => {
    if (!fecha) return "—";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // 🎨 Colores de badges según decisión
  const getDecisionColor = (decision) => {
    switch (decision) {
      case "Reprogramar":
        return "danger";
      case "Adelantar":
        return "primary";
      default:
        return "success";
    }
  };

  // 🎨 Colores de badges según estado
  const getEstadoColor = (estado) => {
    switch (estado.toLowerCase()) {
      case "pendiente":
        return "danger"; // 🔴
      case "completado":
        return "success"; // 🟢
      default:
        return "secondary";
    }
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
      {/* 🔲 Capa semitransparente */}
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
        <Card
          className="shadow-lg border-0"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
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
              🔧 Mantenimientos Predictivos
            </h2>
          </Card.Header>

          <Card.Body>
            {/* ⏳ Estado de carga */}
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="success" />
                <p className="mt-2">Cargando datos predictivos...</p>
              </div>
            ) : error ? (
              <p style={{ color: "#d32f2f", fontWeight: "bold" }}>
                ⚠️ {error}
              </p>
            ) : mantenimientos.length === 0 ? (
              <p className="text-center text-muted">
                No hay mantenimientos programados esta semana.
              </p>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover className="align-middle">
                  <thead
                    style={{
                      backgroundColor: "#00482B",
                      color: "#FBE122",
                      textAlign: "center",
                    }}
                  >
                    <tr>
                      <th>Nombre</th>
                      <th>Fecha Programada</th>
                      <th>Estado</th>
                      <th>Decisión</th>
                      <th>Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mantenimientos.map((m, index) => (
                      <tr key={index}>
                        <td>{m.nombre}</td>
                        <td>{formatDate(m.fecha_programada)}</td>
                        <td style={{ textTransform: "capitalize" }}>
                          <Badge bg={getEstadoColor(m.estado)}>
                            {m.estado}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getDecisionColor(m.decision)}>
                            {m.decision}
                          </Badge>
                        </td>
                        <td>{m.razon}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Predictivo;
