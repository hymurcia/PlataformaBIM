import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  ProgressBar,
  Badge,
} from "react-bootstrap";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import facatativa2 from "../assets/faca12.jpg";

const COLORS = ["#FFBB28", "#00C49F"];
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const PanelOperativo = ({ auth }) => {
  const [metricas, setMetricas] = useState(null);
  const [clima, setClima] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.isAuthenticated && auth.user?.id) {
      fetchDatos();
    }
  }, [auth]);

  const fetchDatos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const [resClima, resMetricas] = await Promise.all([
        axios.get(`${API_BASE_URL}/clima/facatativa`),
        axios.get(`${API_BASE_URL}/metricas/operativo/${auth.user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setClima(resClima.data);
      setMetricas(resMetricas.data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar la información del panel");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container
        fluid
        className="d-flex flex-column justify-content-center align-items-center vh-100"
        style={{ background: "linear-gradient(135deg, #b2ebf2, #e0f7fa)" }}
      >
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando panel...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <div className="alert alert-danger text-center">{error}</div>
      </Container>
    );
  }

  // === Datos de gráficos: Pendiente y Completado ===
  const incidentesData = [
    { name: "Pendiente", value: metricas?.incidentes?.kanban?.en_progreso?.length ?? 0 },
    { name: "Completado", value: metricas?.incidentes?.kanban?.terminado?.length ?? 0 },
  ];

  const mantenimientosData = [
    { name: "Pendiente", value: metricas?.mantenimientos?.kanban?.en_progreso?.length ?? 0 },
    { name: "Completado", value: metricas?.mantenimientos?.kanban?.terminado?.length ?? 0 },
  ];

  const totalTareas = metricas?.resumen?.total_tareas ?? 0;

  const renderKanbanCards = (items) => {
    if (!items || items.length === 0) return <p className="text-center">No hay tareas</p>;
    return items.map((t, i) => (
      <Card
        key={i}
        className={`mb-2 border-${t.progreso === 100 ? "success" : "warning"}`}
        onClick={() => t.progreso !== 100 && navigate("/mis-tareas")}
        style={{ cursor: t.progreso === 100 ? "default" : "pointer" }}
      >
        <Card.Body style={{ backgroundColor: t.progreso === 100 ? "#d4edda" : "#fff3cd" }}>
          <strong>{t.tarea}</strong>{" "}
          <Badge bg={t.progreso === 100 ? "success" : "warning"}>{t.prioridad}</Badge>
          <ProgressBar now={t.progreso} label={`${t.progreso}%`} className="mt-2" />
        </Card.Body>
      </Card>
    ));
  };

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          borderRadius: "20px",
          padding: "25px",
        }}
      >
        <h2 className="text-center mb-4">📊 Panel Operativo - {auth.user.nombre}</h2>

        {/* TARJETAS ESTADÍSTICAS */}
        <Row className="mb-4 text-center">
          <Col md={4}>
            <Card className="shadow">
              <Card.Body>
                <h5>Total de Tareas</h5>
                <h3>{totalTareas}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow">
              <Card.Body>
                <h5>Pendientes</h5>
                <h3>{metricas?.resumen?.en_progreso ?? 0}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow">
              <Card.Body>
                <h5>Completados</h5>
                <h3>{metricas?.resumen?.terminadas ?? 0}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* CLIMA */}
          <Col md={4}>
            <Card className="shadow text-center mb-4">
              <Card.Body>
                <h5 className="text-primary mb-3">🌤️ Clima Actual</h5>
                <h3>{clima?.main?.temp ?? "--"} °C</h3>
                <p>
                  Sensación: {clima?.main?.feels_like ?? "--"} °C
                  <br />
                  Humedad: {clima?.main?.humidity ?? "--"}% <br />
                  {clima?.weather?.[0]?.description ?? "--"}
                </p>
                {clima?.weather?.[0]?.icon && (
                  <img
                    src={`https://openweathermap.org/img/wn/${clima.weather[0].icon}@2x.png`}
                    alt="clima"
                  />
                )}
              </Card.Body>
            </Card>

            {/* PIE INCIDENTES */}
            <Card className="shadow text-center mb-4">
              <Card.Header className="bg-danger text-white">Estado de Incidentes</Card.Header>
              <Card.Body style={{ height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {incidentesData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>

            {/* PIE MANTENIMIENTOS */}
            <Card className="shadow text-center">
              <Card.Header className="bg-info text-white">Estado de Mantenimientos</Card.Header>
              <Card.Body style={{ height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mantenimientosData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {mantenimientosData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          {/* KANBAN */}
          <Col md={8}>
            <Card className="shadow">
              <Card.Header className="bg-success text-white text-center">Reporte Kanban</Card.Header>
              <Card.Body style={{ maxHeight: "800px", overflowY: "auto" }}>
                <Row>
                  <Col md={6}>
                    <h6 className="text-center text-danger">Incidentes</h6>
                    {renderKanbanCards(metricas?.incidentes?.kanban?.en_progreso)}
                    {renderKanbanCards(metricas?.incidentes?.kanban?.terminado)}
                  </Col>
                  <Col md={6}>
                    <h6 className="text-center text-info">Mantenimientos</h6>
                    {renderKanbanCards(metricas?.mantenimientos?.kanban?.en_progreso)}
                    {renderKanbanCards(metricas?.mantenimientos?.kanban?.terminado)}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default PanelOperativo;
