import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Table,
  Form,
  Button,
} from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useNavigate, Link } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const MetricasPanel = ({ auth }) => {
  const [metricasIncidentes, setMetricasIncidentes] = useState(null);
  const [metricasMantenimientos, setMetricasMantenimientos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fechas, setFechas] = useState({
    inicio: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    fin: new Date(),
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.rol_id === 2) {
      fetchMetricas();
    } else {
      navigate("/");
    }
  }, [auth]);

  const fetchMetricas = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const [resIncidentes, resMantenimientos] = await Promise.all([
        axios.get(`${API_BASE_URL}/metricas/incidentes`, {
          params: {
            inicio: fechas.inicio.toISOString().split("T")[0],
            fin: fechas.fin.toISOString().split("T")[0],
          },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/metricas/mantenimientos`, {
          params: {
            inicio: fechas.inicio.toISOString().split("T")[0],
            fin: fechas.fin.toISOString().split("T")[0],
          },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMetricasIncidentes(resIncidentes.data);
      setMetricasMantenimientos(resMantenimientos.data);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar métricas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando Panel...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <div className="alert alert-danger">{error}</div>
        <Button onClick={fetchMetricas} variant="primary">
          Reintentar
        </Button>
      </Container>
    );
  }

  // 📌 Datos Incidentes
  const dataTipo = metricasIncidentes?.porTipo?.map((tipo) => ({
    name: tipo.tipo,
    resueltos: tipo.resueltos,
    pendientes: tipo.total - tipo.resueltos,
    total: tipo.total,
    eficiencia: Math.round((tipo.resueltos / tipo.total) * 100),
    tiempo: tipo.tiempo_promedio_horas || "N/A",
  })) || [];

  const dataTendencia = metricasIncidentes?.tendencia?.map((mes) => ({
    name: new Date(mes.mes).toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    }),
    reportados: mes.total,
    resueltos: mes.resueltos,
  })).reverse() || [];

  const dataEstado = [
    { name: "Pendiente", value: metricasIncidentes?.generales?.pendiente || 0 },
    { name: "Asignado", value: metricasIncidentes?.generales?.asignado || 0 },
    { name: "En Proceso", value: metricasIncidentes?.generales?.en_proceso || 0 },
    { name: "Resuelto", value: metricasIncidentes?.generales?.resuelto || 0 },
    { name: "Rechazado", value: metricasIncidentes?.generales?.rechazado || 0 },
  ];

  const dataMantenimientos = metricasMantenimientos?.porFrecuencia?.map((m) => ({
    name: m.frecuencia,
    realizados: m.completados,
    pendientes: m.total - m.completados,
    total: m.total,
    eficiencia: Math.round((m.completados / m.total) * 100),
  })) || [];

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">📊 Panel de Métricas</h2>

      {/* ===== FILTROS ===== */}
      <Form className="d-flex gap-3 mb-4 flex-wrap">
        <Form.Group>
          <Form.Label>Desde</Form.Label>
          <Form.Control
            type="date"
            value={fechas.inicio.toISOString().split("T")[0]}
            onChange={(e) => setFechas({ ...fechas, inicio: new Date(e.target.value) })}
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Hasta</Form.Label>
          <Form.Control
            type="date"
            value={fechas.fin.toISOString().split("T")[0]}
            onChange={(e) => setFechas({ ...fechas, fin: new Date(e.target.value) })}
          />
        </Form.Group>
        <div className="align-self-end">
          <Button onClick={fetchMetricas}>Aplicar Filtros</Button>
        </div>
      </Form>

      {/* ======= INCIDENTES ======= */}
      <h3 className="mb-3">🚨 Métricas de Incidentes</h3>

      <Row className="mb-4 g-3 d-flex flex-row flex-nowrap overflow-auto">
        <Col style={{ flex: "1 0 20%" }}>
          <Card className="text-white bg-primary shadow">
            <Card.Body>
              <Card.Title>Total Incidentes</Card.Title>
              <h1>{metricasIncidentes?.generales?.total || 0}</h1>
            </Card.Body>
          </Card>
        </Col>
        <Col style={{ flex: "1 0 20%" }}>
          <Card className="text-white bg-success shadow">
            <Card.Body>
              <Card.Title>Resueltos</Card.Title>
              <h1>{metricasIncidentes?.generales?.resuelto || 0}</h1>
            </Card.Body>
          </Card>
        </Col>
        <Col style={{ flex: "1 0 20%" }}>
          <Link to="/admin/tareas" style={{ textDecoration: "none" }}>
            <Card className="text-white bg-warning shadow" style={{ cursor: "pointer" }}>
              <Card.Body>
                <Card.Title>Pendientes</Card.Title>
                <h1>{metricasIncidentes?.generales?.pendiente || 0}</h1>
              </Card.Body>
            </Card>
          </Link>
        </Col>
        <Col style={{ flex: "1 0 20%" }}>
          <Card className="text-white bg-info shadow">
            <Card.Body>
              <Card.Title>Asignados</Card.Title>
              <h1>{metricasIncidentes?.generales?.asignado || 0}</h1>
            </Card.Body>
          </Card>
        </Col>
        <Col style={{ flex: "1 0 20%" }}>
          <Card
            className={`text-white shadow`}
            style={{
              backgroundColor:
                metricasIncidentes?.generales?.total > 0
                  ? (metricasIncidentes.generales.resuelto / metricasIncidentes.generales.total) * 100 < 52
                    ? '#dc3545'
                    : '#28a745'
                  : '#6c757d'
            }}
          >
            <Card.Body>
              <Card.Title>Eficiencia</Card.Title>
              <h1>
                {metricasIncidentes?.generales?.total > 0
                  ? Math.round((metricasIncidentes.generales.resuelto / metricasIncidentes.generales.total) * 100) + '%'
                  : '0%'}
              </h1>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráficos incidentes */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>📈 Tendencia Mensual</Card.Header>
            <Card.Body style={{ height: "320px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataTendencia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reportados" stroke="#8884d8" name="Reportados" />
                  <Line type="monotone" dataKey="resueltos" stroke="#00C49F" name="Resueltos" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mt-4">
            <Card.Header>🏅 Top Responsables</Card.Header>
            <Card.Body>
              <Table striped bordered hover size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Responsable</th>
                    <th>Tareas Asignadas</th>
                    <th>Completadas</th>
                    <th>Tiempo Prom. (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {metricasIncidentes?.responsables?.length > 0 ? (
                    metricasIncidentes.responsables.map((r, i) => (
                      <tr key={i}>
                        <td>{r.nombre}</td>
                        <td>{r.tareas_asignadas}</td>
                        <td>{r.tareas_completadas}</td>
                        <td>{r.tiempo_promedio_horas || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center">
                        No hay datos de responsables
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tipos de incidentes */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>📌 Tipos de Incidentes</Card.Header>
            <Card.Body style={{ height: "350px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataTipo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resueltos" stackId="a" fill="#00C49F" name="Resueltos" />
                  <Bar dataKey="pendientes" stackId="a" fill="#FF8042" name="Pendientes" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla detalle incidentes */}
      <Card className="mt-4">
        <Card.Header>📋 Detalle por Tipo</Card.Header>
        <Card.Body>
          <Table striped bordered hover size="sm">
            <thead className="table-light">
              <tr>
                <th>Tipo</th>
                <th>Total</th>
                <th>Resueltos</th>
                <th>Pendientes</th>
                <th>Tiempo Prom. (h)</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {dataTipo.length > 0 ? (
                dataTipo.map((t, i) => (
                  <tr key={i}>
                    <td>{t.name}</td>
                    <td>{t.total}</td>
                    <td>{t.resueltos}</td>
                    <td>{t.pendientes}</td>
                    <td>{t.tiempo}</td>
                    <td>{t.eficiencia}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No hay datos
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* ======= MANTENIMIENTOS ======= */}
      <h3 className="mb-3 mt-5">🛠️ Métricas de Mantenimientos</h3>

      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-white bg-primary shadow">
            <Card.Body>
              <Card.Title>Total Mantenimientos</Card.Title>
              <h1>{metricasMantenimientos?.generales?.total || 0}</h1>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-white bg-success shadow">
            <Card.Body>
              <Card.Title>Completados</Card.Title>
              <h1>{metricasMantenimientos?.generales?.completado || 0}</h1>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Link to="/mantenimientos" style={{ textDecoration: "none" }}>
            <Card className="text-white bg-warning shadow" style={{ cursor: "pointer" }}>
              <Card.Body>
                <Card.Title>Pendientes</Card.Title>
                <h1>{metricasMantenimientos?.generales?.pendiente || 0}</h1>
              </Card.Body>
            </Card>
          </Link>
        </Col>

        <Col md={3}>
          <Card
            className={`text-white shadow`}
            style={{
              backgroundColor:
                metricasMantenimientos?.generales?.total > 0
                  ? (metricasMantenimientos.generales.completado / metricasMantenimientos.generales.total) * 100 < 52
                    ? '#dc3545'
                    : '#28a745'
                  : '#6c757d'
            }}
          >
            <Card.Body>
              <Card.Title>Eficiencia</Card.Title>
              <h1>
                {metricasMantenimientos?.generales?.total > 0
                  ? Math.round((metricasMantenimientos.generales.completado / metricasMantenimientos.generales.total) * 100) + '%'
                  : '0%'}
              </h1>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla mantenimientos */}
      <Card className="mt-4">
        <Card.Header>📋 Detalle de Mantenimientos</Card.Header>
        <Card.Body>
          <Table striped bordered hover size="sm">
            <thead className="table-light">
              <tr>
                <th>Frecuencia</th>
                <th>Total</th>
                <th>Completados</th>
                <th>Pendientes</th>
                <th>Tiempo Prom. (h)</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {metricasMantenimientos?.porFrecuencia?.length > 0 ? (
                (() => {
                  const grouped = metricasMantenimientos.porFrecuencia.reduce((acc, m) => {
                    const frecuencia = m.frecuencia
                      ? m.frecuencia.charAt(0).toUpperCase() + m.frecuencia.slice(1).toLowerCase()
                      : "N/A";
                    if (!acc[frecuencia]) acc[frecuencia] = { total: 0, completados: 0, tiempos: [] };
                    acc[frecuencia].total += Number(m.total) || 0;
                    acc[frecuencia].completados += Number(m.completados) || 0;
                    if (!isNaN(Number(m.tiempo_promedio_horas))) acc[frecuencia].tiempos.push(Number(m.tiempo_promedio_horas));
                    return acc;
                  }, {});

                  return Object.entries(grouped).map(([frecuencia, val], i) => {
                    const pendientes = val.total - val.completados;
                    const eficiencia = val.total > 0 ? Math.round((val.completados / val.total) * 100) : 0;
                    const tiempoProm = val.tiempos.length
                      ? (val.tiempos.reduce((a, b) => a + b, 0) / val.tiempos.length).toFixed(2)
                      : "N/A";
                    return (
                      <tr key={i}>
                        <td>{frecuencia}</td>
                        <td>{val.total}</td>
                        <td>{val.completados}</td>
                        <td>{pendientes}</td>
                        <td>{tiempoProm}</td>
                        <td>{eficiencia}%</td>
                      </tr>
                    );
                  });
                })()
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No hay datos
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MetricasPanel;
