import React, { useEffect, useState } from "react";
import { Table, Card, Spinner, Alert } from "react-bootstrap";
import axios from "axios";

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

  return (
    <Card className="p-3 shadow-lg border-0">
      <Card.Header style={{ backgroundColor: "#00482B", color: "#FBE122", fontWeight: "bold" }}>
        📋 Logs de Usuarios
      </Card.Header>
      <Card.Body>
        {loading && <Spinner animation="border" variant="success" />}
        {error && <Alert variant="danger">{error}</Alert>}

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
                    <td>{new Date(log.fecha).toLocaleString("es-ES")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">No hay logs</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
};

export default LogsUsuarios;
