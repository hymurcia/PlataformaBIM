import React, { useEffect, useState } from "react";
import { Table, Card, Spinner, Alert, Container, Image } from "react-bootstrap";
import axios from "axios";
import facatativa2 from "../assets/facatativa-2.jpg";
import escudoColor from "../assets/ESCUDO COLOR.png";

const LogsUsuarios = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/logs", { headers });
        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setError("Error cargando logs de usuarios");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Formato bonito de fecha (ej: 22 de octubre de 2025, 18:45:02)
  const formatDate = (fecha) => {
    if (!fecha) return "N/A";
    const d = new Date(fecha);
    const opciones = {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return d.toLocaleDateString("es-CO", opciones);
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
      {/* Capa oscura */}
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Image src={escudoColor} alt="Escudo" height="50" />
              <h2 style={{ margin: 0, color: "#FBE122", fontWeight: "bold" }}>
                Logs de Usuarios
              </h2>
            </div>
          </Card.Header>

          <Card.Body>
            {loading && (
              <div className="text-center my-5">
                <Spinner animation="border" variant="success" />
                <p className="mt-2">Cargando logs...</p>
              </div>
            )}

            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && (
              <div className="table-responsive">
                <Table striped bordered hover className="align-middle text-center">
                  <thead style={{ backgroundColor: "#00482B", color: "#FBE122" }}>
                    <tr>
                      <th>ID</th>
                      <th>Usuario</th>
                      <th>Acción</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td>{log.id}</td>
                          <td>{log.nombre} {log.apellido}</td>
                          <td>{log.accion}</td>
                          <td>{formatDate(log.fecha)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4">
                          No hay logs
                        </td>
                      </tr>
                    )}
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

export default LogsUsuarios;
