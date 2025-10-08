import React, { useEffect, useState } from "react";
import axios from "axios";
import { ProgressBar, Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import facatativaFondo from "../assets/facatativa-2.jpg"; // asegúrate de tener la imagen
import "./TablaComponente.css"; // estilos externos opcionales

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const TablaComponentes = () => {
  const [componentes, setComponentes] = useState([]);
  const [inventario, setInventario] = useState([]); // ✅ agregado
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    numero_serie: "",
    vida_util_meses: "",
    ubicacion_id: "",
    inventario_id: "",
  });

  const [componenteBaja, setComponenteBaja] = useState(null);
  const [nuevoNumeroSerie, setNuevoNumeroSerie] = useState("");

  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  // 🔹 Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const resComp = await axios.get(`${API_BASE_URL}/componentes`, { headers });
      const resUb = await axios.get(`${API_BASE_URL}/ubicaciones`, { headers });
      setComponentes(resComp.data);
      setUbicaciones(resUb.data);
    } catch (err) {
      setError("❌ Error al cargar componentes o ubicaciones");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventario = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/inventario`, { headers });
      setInventario(res.data); // ✅ ahora funciona
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInventario();
  }, []);

  // 🔹 Autocompletar inventario
  useEffect(() => {
    if (form.inventario_id) {
      const item = inventario.find(
        (i) => i.id === parseInt(form.inventario_id)
      );
      if (item) {
        setForm((prev) => ({
          ...prev,
          nombre: item.nombre,
          descripcion: item.descripcion || "",
          vida_util_meses: item.vida_util_meses || "",
        }));
      }
    } else {
      setForm((prev) => ({
        ...prev,
        nombre: "",
        descripcion: "",
        vida_util_meses: "",
      }));
    }
  }, [form.inventario_id, inventario]);

  // 🔹 Crear componente
  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        vida_util_meses: form.vida_util_meses
          ? parseInt(form.vida_util_meses)
          : null,
        ubicacion_id: form.ubicacion_id ? parseInt(form.ubicacion_id) : null,
        inventario_id: form.inventario_id ? parseInt(form.inventario_id) : null,
      };
      const res = await axios.post(`${API_BASE_URL}/componentes`, payload, {
        headers,
      });
      alert(res.data.message || "✅ Componente creado correctamente");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "❌ Error al crear componente");
    }
  };

  const resetForm = () => {
    setForm({
      nombre: "",
      descripcion: "",
      numero_serie: "",
      vida_util_meses: "",
      ubicacion_id: "",
      inventario_id: "",
    });
  };

  // 🔹 Vida útil
const obtenerPorcentajeVida = (c) => {
  const vidaUtil = c.vida_util_meses || 0;
  if (!c.fecha_instalacion || !vidaUtil) {
    return { porcentaje: 0, color: 'secondary', texto: 'Sin datos' };
  }

  const fechaInstalacion = new Date(c.fecha_instalacion);
  const hoy = new Date();
  const mesesUsados = (hoy.getFullYear() - fechaInstalacion.getFullYear()) * 12
    + (hoy.getMonth() - fechaInstalacion.getMonth());

  const porcentaje = Math.min((mesesUsados / vidaUtil) * 100, 100);

  let color = "success";
  let texto = "En buen estado";
  if (porcentaje >= 100) {
    color = "danger";
    texto = "Revisión inmediata";
  } else if (porcentaje >= 80) {
    color = "warning";
    texto = "Revisión próxima";
  }

  return { porcentaje, color, texto };
};



  // 🔹 Filtrar
  const componentesFiltrados = filtroUbicacion
    ? componentes.filter((c) => c.ubicacion_id === parseInt(filtroUbicacion))
    : componentes;

  const abrirModalBaja = (componente) => {
    setComponenteBaja(componente);
    setNuevoNumeroSerie("");
    setShowBajaModal(true);
  };

  const handleDarDeBaja = async () => {
    if (!nuevoNumeroSerie) {
      alert("⚠️ Debes ingresar un número de serie para el reemplazo");
      return;
    }
    try {
      const res = await axios.put(
        `${API_BASE_URL}/componentes/${componenteBaja.id}/baja`,
        { numero_serie: nuevoNumeroSerie },
        { headers }
      );
      alert(res.data.message || "🧩 Componente dado de baja");
      setShowBajaModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "❌ Error al dar de baja el componente");
    }
  };

  return (
    <div
      className="tabla-componentes-container"
      style={{
        backgroundImage: `url(${facatativaFondo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div
        className="overlay"
        style={{
          backgroundColor: "rgba(0,0,0,0.65)",
          borderRadius: "16px",
          padding: "30px",
          maxWidth: "1100px",
          margin: "0 auto",
          color: "#fff",
          boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
        }}
      >
        <h3 className="mb-4 text-center fw-bold">
          🧩 Gestión de Componentes del Sistema
        </h3>

        {/* Filtro */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="d-flex gap-2 align-items-center">
            <Form.Label className="mb-0">Filtrar por ubicación:</Form.Label>
            <Form.Select
              className="w-auto"
              value={filtroUbicacion}
              onChange={(e) => setFiltroUbicacion(e.target.value)}
            >
              <option value="">Todas</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Form.Select>
            {filtroUbicacion && (
              <Badge bg="info">
                {componentesFiltrados.length} componentes
              </Badge>
            )}
          </div>

          <Button variant="success" onClick={() => setShowModal(true)}>
            ➕ Nuevo Componente
          </Button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" variant="light" /> Cargando datos...
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-striped table-hover align-middle rounded-3 overflow-hidden">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Número de serie</th>
                  <th>Vida útil</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Revisión</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {componentesFiltrados.length > 0 ? (
                  componentesFiltrados.map((c) => {
                    const { porcentaje, color, texto } = obtenerPorcentajeVida(c);
                    return (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.nombre}</td>
                        <td>{c.numero_serie || "-"}</td>
                        <td>{c.vida_util_meses || "-"}</td>
                        <td>
                          {ubicaciones.find((u) => u.id === c.ubicacion_id)?.nombre || "Sin ubicación"}
                        </td>
                        <td>
                          <Badge bg={c.estado === "activo" ? "success" : "secondary"}>
                            {c.estado}
                          </Badge>
                        </td>
                        <td style={{ minWidth: "180px" }}>
                          <ProgressBar
                            now={porcentaje}
                            variant={color}
                            label={`${texto} (${Math.round(porcentaje)}%)`}
                            animated
                          />
                        </td>
                        <td>
                          {c.estado !== "baja" && (
                            <Button size="sm" variant="danger" onClick={() => abrirModalBaja(c)}>
                              Dar de baja
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center">
                      No hay componentes registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>➕ Crear nuevo componente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Inventario disponible</Form.Label>
              <Form.Select
                value={form.inventario_id}
                onChange={(e) =>
                  setForm({ ...form, inventario_id: e.target.value })
                }
              >
                <option value="">Seleccione...</option>
                {inventario.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} (Stock: {i.cantidad})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ubicación</Form.Label>
              <Form.Select
                value={form.ubicacion_id}
                onChange={(e) =>
                  setForm({ ...form, ubicacion_id: e.target.value })
                }
              >
                <option value="">Seleccione...</option>
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Número de serie</Form.Label>
              <Form.Control
                placeholder="Ej: COMP-12345"
                value={form.numero_serie}
                onChange={(e) =>
                  setForm({ ...form, numero_serie: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleCreate}
            disabled={!form.inventario_id || !form.ubicacion_id || !form.numero_serie}
          >
            Crear
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Baja */}
      <Modal show={showBajaModal} onHide={() => setShowBajaModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>⚠️ Dar de baja componente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Estás por dar de baja el componente{" "}
            <strong>{componenteBaja?.nombre}</strong>.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Número de serie del reemplazo</Form.Label>
            <Form.Control
              placeholder="Nuevo número de serie"
              value={nuevoNumeroSerie}
              onChange={(e) => setNuevoNumeroSerie(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBajaModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={!nuevoNumeroSerie}
            onClick={handleDarDeBaja}
          >
            Confirmar baja
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TablaComponentes; // ✅ corregido
