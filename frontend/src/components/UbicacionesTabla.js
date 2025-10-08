import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Card, Spinner, Table, Alert, Button, Form } from "react-bootstrap";
import facatativa2 from "../assets/facatativa-2.jpg";

// 🌎 URL base del backend
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const UbicacionesTable = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ area: "", bloque: "", piso: "", salon: "" });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const token = localStorage.getItem("token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  // 🔄 Obtener ubicaciones
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/ubicaciones`, { headers });
      setUbicaciones(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Error cargando ubicaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✏️ Manejo de cambios en formulario con exclusión mutua
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };

      if (name === "area" && value.trim() !== "") {
        newForm.bloque = "";
        newForm.piso = "";
        newForm.salon = "";
      }

      if (
        (name === "bloque" || name === "piso" || name === "salon") &&
        (newForm.bloque || newForm.piso || newForm.salon)
      ) {
        newForm.area = "";
      }

      return newForm;
    });
  };

  // 💾 Crear nueva ubicación
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.area && !(form.bloque && form.piso && form.salon)) {
      setFormError("⚠️ Debes completar Área o Bloque + Piso + Salón");
      return;
    }

    try {
      setFormLoading(true);
      const res = await axios.post(`${API_BASE_URL}/ubicaciones`, form, { headers });
      setUbicaciones((prev) => [...prev, res.data.ubicacion]);
      setForm({ area: "", bloque: "", piso: "", salon: "" });
      setFormError("");
      setFormSuccess("✅ Ubicación creada con éxito");

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError("❌ Error creando la ubicación.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* 🟩 Capa oscura semitransparente */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1,
        }}
      ></div>

      <Container style={{ zIndex: 2 }}>
        <Card
          className="shadow-lg border-0 my-5"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
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
            <h3 style={{ margin: 0, color: "#FBE122", fontWeight: "bold" }}>
              📍 Gestión de Ubicaciones
            </h3>
          </Card.Header>

          <Card.Body>
            {loading && (
              <div className="text-center my-4">
                <Spinner animation="border" variant="success" />
                <p className="mt-2">Cargando ubicaciones...</p>
              </div>
            )}

            {error && <Alert variant="danger">{error}</Alert>}

            {/* 🧩 Formulario de creación */}
            <Card className="p-3 mb-4">
              <h5 className="text-success mb-3">➕ Crear nueva ubicación</h5>
              {formError && <Alert variant="danger">{formError}</Alert>}
              {formSuccess && <Alert variant="success">{formSuccess}</Alert>}

              <Form onSubmit={handleSubmit}>
                <div className="row g-2">
                  <div className="col-md-3">
                    <Form.Control
                      type="text"
                      placeholder="Área"
                      name="area"
                      value={form.area}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-3">
                    <Form.Select
                      name="bloque"
                      value={form.bloque}
                      onChange={handleChange}
                    >
                      <option value="">Bloque</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Form.Select
                      name="piso"
                      value={form.piso}
                      onChange={handleChange}
                    >
                      <option value="">Piso</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-3">
                    <Form.Control
                      type="text"
                      placeholder="Salón"
                      name="salon"
                      value={form.salon}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-3"
                  variant="success"
                  disabled={formLoading}
                >
                  {formLoading ? "Creando..." : "Crear Ubicación"}
                </Button>
              </Form>
            </Card>

            {/* 📋 Tabla de ubicaciones */}
            <div className="table-responsive">
              <Table striped bordered hover className="align-middle text-center">
                <thead
                  style={{
                    backgroundColor: "#00482B",
                    color: "#FBE122",
                  }}
                >
                  <tr>
                    <th>Nombre</th>
                    <th>Área</th>
                    <th>Bloque</th>
                    <th>Piso</th>
                    <th>Salón</th>
                  </tr>
                </thead>
                <tbody>
                  {ubicaciones.length > 0 ? (
                    ubicaciones.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nombre || "—"}</td>
                        <td>{u.area || "—"}</td>
                        <td>{u.bloque || "—"}</td>
                        <td>{u.piso || "—"}</td>
                        <td>{u.salon || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-muted">
                        No hay ubicaciones registradas.
                      </td>
                    </tr>
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

export default UbicacionesTable;
