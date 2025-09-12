// src/components/PanelInformes.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Button,
  Spinner,
  Tabs,
  Tab,
  Container,
  Alert,
} from "react-bootstrap";

const API_URL = "http://localhost:5000/informes";

// Componente reutilizable para tablas
const TablaAuditoria = ({ headers, rows, renderRow }) => {
  if (!rows || rows.length === 0) {
    return <Alert variant="warning">No hay datos disponibles.</Alert>;
  }

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          {headers.map((h, idx) => (
            <th key={idx}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </Table>
  );
};

const PanelInformes = () => {
  const [data, setData] = useState({
    inventario: [],
    mantenimientos: [],
    incidentes: [],
    usuarios: [],
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("inventario");
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setData(res.data || {});
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar auditoría", err);
      setError("No se pudo cargar la información de auditoría.");
      setLoading(false);
    }
  };

  const descargarPDF = async () => {
    try {
      setDownloading(true);
      window.open(`${API_URL}/pdf?modulo=${selectedTab}`, "_blank");
      setDownloading(false);
    } catch (err) {
      setError("Error al generar el PDF.");
      setDownloading(false);
    }
  };

  const handleSelect = (key) => {
    setSelectedTab(key);
    setShowDownload(false); // reset al cambiar de pestaña
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" /> <p>Cargando auditoría...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={cargarDatos} variant="primary">
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <h2 className="my-3">Panel de Informes</h2>

      <Alert variant="info">
        Selecciona un módulo para ver la vista previa y luego confirma si deseas
        descargar el informe en PDF.
      </Alert>

      <Tabs activeKey={selectedTab} onSelect={handleSelect} className="mb-3">
        {/* Inventario */}
        <Tab eventKey="inventario" title="Inventario">
          <TablaAuditoria
            headers={["Nombre", "Cantidad", "Costo Unitario", "Ubicación"]}
            rows={data.inventario}
            renderRow={(item, idx) => (
              <tr key={idx}>
                <td>{item.nombre}</td>
                <td>{item.cantidad}</td>
                <td>
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                  }).format(item.costo_unitario)}
                </td>
                <td>{item.ubicacion_actual}</td>
              </tr>
            )}
          />
        </Tab>

        {/* Mantenimientos */}
        <Tab eventKey="mantenimientos" title="Mantenimientos">
          <TablaAuditoria
            headers={["ID", "Nombre", "Estado", "Fecha Programada", "Responsable"]}
            rows={data.mantenimientos}
            renderRow={(m, idx) => (
              <tr key={idx}>
                <td>{m.id}</td>
                <td>{m.nombre}</td>
                <td>{m.estado}</td>
                <td>{new Date(m.fecha_programada).toLocaleDateString()}</td>
                <td>{m.responsable}</td>
              </tr>
            )}
          />
        </Tab>

        {/* Incidentes */}
        <Tab eventKey="incidentes" title="Incidentes">
          <TablaAuditoria
            headers={["ID", "Descripción", "Estado", "Fecha Creación"]}
            rows={data.incidentes}
            renderRow={(i, idx) => (
              <tr key={idx}>
                <td>{i.id}</td>
                <td>{i.descripcion}</td>
                <td>{i.estado}</td>
                <td>{new Date(i.fecha_creacion).toLocaleString()}</td>
              </tr>
            )}
          />
        </Tab>

        {/* Usuarios */}
        <Tab eventKey="usuarios" title="Usuarios y Roles">
          <TablaAuditoria
            headers={["ID", "Nombre", "Rol"]}
            rows={data.usuarios}
            renderRow={(u, idx) => (
              <tr key={idx}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td>{u.rol}</td>
              </tr>
            )}
          />
        </Tab>
      </Tabs>

      <div className="mt-3">
        {!showDownload ? (
          <Button
            variant="secondary"
            onClick={() => setShowDownload(true)}
          >
            Confirmar Vista Previa
          </Button>
        ) : (
          <Button
            variant="success"
            onClick={descargarPDF}
            disabled={downloading}
          >
            {downloading ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              `Descargar Informe de ${
                selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)
              }`
            )}
          </Button>
        )}
      </div>
    </Container>
  );
};

export default PanelInformes;
