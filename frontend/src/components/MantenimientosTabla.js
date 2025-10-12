// src/components/MantenimientosTabla.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Card, Table, Button, Form, Spinner, Alert } from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

// 🌎 URL base del backend
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const MantenimientosTable = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [componentes, setComponentes] = useState([]);
  const [filteredComponentes, setFilteredComponentes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    frecuencia: "",
    fecha_programada: "",
    operario_id: "",
    componente_id: "",
    ubicacion_id: "",
    dias: "",
    comentarios: ""
  });

  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  // ================= Fetch inicial =================
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resM, resC, resU, resR] = await Promise.all([
        axios.get(`${API_BASE_URL}/mantenimientos`, { headers }),
        axios.get(`${API_BASE_URL}/componentes`, { headers }),
        axios.get(`${API_BASE_URL}/ubicaciones`, { headers }),
        axios.get(`${API_BASE_URL}/asignaciones/responsables`, { headers })
      ]);

      setMantenimientos(resM.data);
      setComponentes(resC.data);
      setUbicaciones(resU.data);
      setResponsables(resR.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= Filtrar componentes disponibles y activos =================
  useEffect(() => {
    if (mantenimientos.length > 0 && componentes.length > 0) {
      const componentesConMantenimiento = mantenimientos
        .filter(m => m.componente_id)
        .map(m => m.componente_id);
      
      const componentesDisponibles = componentes.filter(
        c => !componentesConMantenimiento.includes(c.id) && c.estado === "activo"
      );
      setFilteredComponentes(componentesDisponibles);
    }
  }, [mantenimientos, componentes]);

  // ================= Helpers =================
  const nombreUbicacion = (id) => {
    const u = ubicaciones.find((u) => u.id === parseInt(id));
    return u ? u.nombre : "Sin ubicación";
  };

  const nombreResponsable = (id) => {
    const r = responsables.find((r) => r.id === parseInt(id));
    return r ? `${r.nombre} ${r.apellido}` : "Sin asignar";
  };

  const nombreComponente = (id) => {
    const c = componentes.find((c) => c.id === parseInt(id));
    return c ? c.nombre : "N/A";
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "N/A";
    const date = new Date(fecha);
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(date);
  };

  const estadoBadgeClass = (estado) => {
    switch (estado) {
      case "pendiente": return "bg-warning text-dark";
      case "completado": return "bg-success";
      case "en_progreso": return "bg-primary";
      default: return "bg-secondary";
    }
  };

  // ================= Filtrar componentes por ubicación =================
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "ubicacion_id") {
      const compFiltrados = value
        ? componentes.filter(c => 
            c.ubicacion_id === parseInt(value) && 
            !mantenimientos.some(m => m.componente_id === c.id) &&
            c.estado === "activo"
          )
        : componentes.filter(c => 
            !mantenimientos.some(m => m.componente_id === c.id) &&
            c.estado === "activo"
          );
      
      setFilteredComponentes(compFiltrados);
      setForm(prev => ({ 
        ...prev, 
        componente_id: "", 
        ubicacion_id: value,
        descripcion: "" 
      }));
      return;
    }

    if (name === "componente_id") {
      const comp = componentes.find(c => c.id === parseInt(value));
      if (comp) {
        setForm(prev => ({
          ...prev,
          componente_id: value,
          ubicacion_id: comp.ubicacion_id.toString(),
          descripcion: `Número de serie: ${comp.numero_serie}`
        }));
      } else {
        setForm(prev => ({ ...prev, componente_id: value, descripcion: "" }));
      }
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ================= Validación =================
  const validarMantenimiento = () => {
    // Todos los campos obligatorios excepto componente
    if (!form.nombre || !form.descripcion || !form.frecuencia || !form.fecha_programada || !form.operario_id || !form.ubicacion_id) {
      setFormError("⚠️ Debes llenar todos los campos excepto componente");
      return false;
    }

    // Validación adicional si hay componente
    if (form.componente_id) {
      const existe = mantenimientos.some(m => m.componente_id === parseInt(form.componente_id));
      if (existe) {
        setFormError("⚠️ Este componente ya tiene un mantenimiento asignado");
        return false;
      }

      const componente = componentes.find(c => c.id === parseInt(form.componente_id));
      if (componente && componente.estado !== "activo") {
        setFormError("⚠️ No se puede asignar mantenimiento a un componente que no está activo");
        return false;
      }
    }

    return true;
  };

  // ================= Enviar formulario =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!validarMantenimiento()) return;

    try {
      setFormLoading(true);
      const res = await axios.post(`${API_BASE_URL}/mantenimientos`, form, { headers });
      const mantenimientoCreado = res.data;
      setMantenimientos(prev => [...prev, mantenimientoCreado]);
      setSuccessMessage("✅ Mantenimiento creado con éxito");

      // Actualizar mantenimientos y componentes disponibles
      const resM = await axios.get(`${API_BASE_URL}/mantenimientos`, { headers });
      setMantenimientos(resM.data);

      const componentesConMantenimiento = resM.data
        .filter(m => m.componente_id)
        .map(m => m.componente_id);
      
      const componentesDisponibles = componentes.filter(
        c => !componentesConMantenimiento.includes(c.id) && c.estado === "activo"
      );
      setFilteredComponentes(componentesDisponibles);

      // Asignar responsable al componente si aplica
      if (form.componente_id && form.operario_id) {
        try {
          await axios.put(
            `${API_BASE_URL}/componentes/${form.componente_id}/responsable`,
            { responsable_id: form.operario_id },
            { headers }
          );
        } catch (err2) {
          console.error("Error asignando responsable:", err2);
        }
      }

      setForm({
        nombre: "",
        descripcion: "",
        frecuencia: "",
        fecha_programada: "",
        operario_id: "",
        componente_id: "",
        ubicacion_id: "",
        dias: "",
        comentarios: ""
      });

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setFormError("❌ Error creando el mantenimiento");
    } finally {
      setFormLoading(false);
    }
  };

  // ================= Ordenar mantenimientos =================
  const mantenimientosOrdenados = [...mantenimientos]
    .filter(m => {
      if (!m.componente_id) return true;
      const comp = componentes.find(c => c.id === m.componente_id);
      return comp && comp.estado !== "baja";
    })
    .sort((a, b) => {
      if (!a.fecha_programada) return 1;
      if (!b.fecha_programada) return -1;
      return new Date(a.fecha_programada) - new Date(b.fecha_programada);
    });

  // ================= Render =================
  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        padding: "2rem",
        position: "relative",
        overflowY: "auto"
      }}
    >
      <div style={{ position: "absolute", top:0, left:0, width:"100%", height:"100%", backgroundColor:"rgba(0,0,0,0.5)", zIndex:1 }}></div>

      <Container style={{ position:"relative", zIndex: 2 }}>
        <Card className="shadow-lg border-0">
          <Card.Header style={{ backgroundColor:"#00482B", color:"#FBE122", fontWeight:"bold" }}>
            🛠️ Gestión de Mantenimientos
          </Card.Header>
          <Card.Body>
            {loading && <div className="text-center my-3"><Spinner animation="border" variant="success" /> Cargando...</div>}
            {error && <Alert variant="danger">{error}</Alert>}
            {successMessage && <Alert variant="success">{successMessage}</Alert>}

            {/* Formulario */}
            <Card className="mb-4 p-3">
              <h5 className="text-success mb-3">➕ Crear mantenimiento</h5>
              {formError && <Alert variant="danger">{formError}</Alert>}
              <Form onSubmit={handleSubmit}>
                <div className="row g-2 mb-2">
                  <div className="col-md-3">
                    <Form.Control type="text" placeholder="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
                  </div>
                  <div className="col-md-3">
                    <Form.Control type="text" placeholder="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} required />
                  </div>
                  <div className="col-md-2">
                    <Form.Select name="frecuencia" value={form.frecuencia} onChange={handleChange} required>
                      <option value="">Frecuencia</option>
                      <option value="diario">Diario</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-2">
                    <Form.Control type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleChange} required />
                  </div>
                  <div className="col-md-2">
                    <Form.Control type="number" placeholder="Días" name="dias" value={form.dias} onChange={handleChange} required />
                  </div>
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-md-3">
                    <Form.Select name="ubicacion_id" value={form.ubicacion_id} onChange={handleChange} required>
                      <option value="">Selecciona ubicación</option>
                      {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Form.Select name="componente_id" value={form.componente_id} onChange={handleChange}>
                      <option value="">Selecciona componente (opcional)</option>
                      {filteredComponentes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} - {c.numero_serie}</option>
                      ))}
                    </Form.Select>
                    <small className="text-muted">Solo componentes activos sin mantenimiento asignado</small>
                  </div>
                  <div className="col-md-3">
                    <Form.Select name="operario_id" value={form.operario_id} onChange={handleChange} required>
                      <option value="">Selecciona responsable</option>
                      {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>)}
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Form.Control type="text" placeholder="Comentarios" name="comentarios" value={form.comentarios} onChange={handleChange} required />
                  </div>
                </div>

                <Button type="submit" variant="success" disabled={formLoading}>
                  {formLoading ? "Creando..." : "Crear mantenimiento"}
                </Button>
              </Form>
            </Card>

            {/* Tabla */}
            <div className="table-responsive" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <Table striped bordered hover className="align-middle text-center mb-0">
                <thead style={{ backgroundColor:"#00482B", color:"#FBE122", position:"sticky", top:0, zIndex:3 }}>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Frecuencia</th>
                    <th>Responsable</th>
                    <th>Componente</th>
                    <th>Ubicación</th>
                    <th>Fecha Programada</th>
                    <th>Última Ejecución</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientosOrdenados.length > 0 ? (
                    mantenimientosOrdenados.map(m => (
                      <tr key={m.id}>
                        <td>{m.nombre}</td>
                        <td>{m.descripcion}</td>
                        <td><span className="badge bg-info text-dark">{m.frecuencia}</span></td>
                        <td>{m.operario_id ? nombreResponsable(m.operario_id) : 'Sin asignar'}</td>
                        <td>{m.componente_id ? nombreComponente(m.componente_id) : 'General'}</td>
                        <td>{m.ubicacion_id ? nombreUbicacion(m.ubicacion_id) : 'Sin ubicación'}</td>
                        <td>{formatFecha(m.fecha_programada)}</td>
                        <td>{formatFecha(m.fecha_ultima_ejecucion)}</td>
                        <td><span className={`badge ${estadoBadgeClass(m.estado)}`}>{m.estado}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="9" className="text-center">No hay mantenimientos</td></tr>
                  )}
                </tbody>
              </Table>
            </div>

          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default MantenimientosTable;
