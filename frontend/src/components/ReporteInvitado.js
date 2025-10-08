// src/components/ReporteTipo.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, Card } from "react-bootstrap";
import faca12 from "../assets/faca12.jpg";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const ReporteTipo = ({ auth }) => {
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    categoria: "otro",
    ubicacion_id: "",
    prioridad: "media",
    archivos: [],
  });

  const [ubicaciones, setUbicaciones] = useState([]);
  const [error, setError] = useState("");
  const [camposFaltantes, setCamposFaltantes] = useState([]);
  const [success, setSuccess] = useState("");
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Cargar ubicaciones
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/ubicaciones`)
      .then((res) => setUbicaciones(res.data))
      .catch(() => setError("Error cargando ubicaciones"));
  }, []);

  // Liberar memoria de las previsualizaciones al desmontar
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  // Manejo de inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (camposFaltantes.length > 0) setCamposFaltantes([]);
  };

  // Manejo de archivos
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);

    const archivosValidos = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`El archivo ${file.name} excede el tamaño máximo (5MB).`);
        return false;
      }
      return true;
    });

    previews.forEach((url) => URL.revokeObjectURL(url));

    const newPreviews = archivosValidos
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));

    setPreviews(newPreviews);
    setFormData((prev) => ({ ...prev, archivos: archivosValidos }));
  };

  // Remover archivo
  const removerArchivo = (index) => {
    const nuevosArchivos = [...formData.archivos];
    const archivoRemovido = nuevosArchivos.splice(index, 1)[0];
    setFormData((prev) => ({ ...prev, archivos: nuevosArchivos }));

    if (archivoRemovido && archivoRemovido.type.startsWith("image/")) {
      const nuevasPreviews = [...previews];
      URL.revokeObjectURL(nuevasPreviews[index]);
      nuevasPreviews.splice(index, 1);
      setPreviews(nuevasPreviews);
    }
  };

  // Envío de formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCamposFaltantes([]);
    setIsSubmitting(true);

    const faltantes = [];
    if (!formData.titulo.trim()) faltantes.push("titulo");
    if (!formData.descripcion.trim()) faltantes.push("descripcion");
    if (!formData.categoria.trim()) faltantes.push("categoria");
    if (!formData.ubicacion_id) faltantes.push("ubicacion_id");
    if (!formData.prioridad.trim()) faltantes.push("prioridad");

    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setError("Por favor complete todos los campos requeridos.");
      setIsSubmitting(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("titulo", formData.titulo);
      fd.append("descripcion", formData.descripcion);
      fd.append("tipo", formData.categoria);
      fd.append("ubicacion_id", formData.ubicacion_id);
      fd.append("gravedad", formData.prioridad);
      formData.archivos.forEach((file) => fd.append("imagenes", file));

      await axios.post(`${API_BASE_URL}/reportes/invitado`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          "user-id": auth?.isAuthenticated ? auth.user.id : "",
        },
      });

      setSuccess("Reporte enviado con éxito ✅");
      setFormData({
        titulo: "",
        descripcion: "",
        categoria: "otro",
        ubicacion_id: "",
        prioridad: "media",
        archivos: [],
      });
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      setTimeout(() => navigate("/reporte/invitado"), 2000);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.error || "Error al enviar reporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar
  const handleCancel = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    navigate("/");
  };

  return (
    <div
      style={{
        backgroundImage: `url(${faca12})`,
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
        <Card
          className="shadow border-0"
          style={{
            borderRadius: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <Card.Header
            className="text-center py-4"
            style={{
              backgroundColor: "#DAAA00",
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
            }}
          >
            <h2 className="mb-0" style={{ color: "#00482B", fontWeight: "bold" }}>
              Reportar Nuevo Caso
            </h2>
          </Card.Header>

          <Card.Body className="p-4">
            {error && <div className="alert alert-danger">{error}</div>}
            {camposFaltantes.length > 0 && (
              <div className="alert alert-warning">
                <strong>Campos requeridos faltantes:</strong>
                <ul>{camposFaltantes.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {/* Título */}
              <div className="mb-3">
                <label className="form-label fw-bold">Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className={`form-control ${
                    camposFaltantes.includes("titulo") ? "is-invalid" : ""
                  }`}
                  maxLength="100"
                  disabled={isSubmitting}
                />
              </div>

              {/* Descripción */}
              <div className="mb-3">
                <label className="form-label fw-bold">Descripción *</label>
                <textarea
                  name="descripcion"
                  rows="4"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className={`form-control ${
                    camposFaltantes.includes("descripcion") ? "is-invalid" : ""
                  }`}
                  maxLength="500"
                  disabled={isSubmitting}
                />
                <div className="form-text">
                  {formData.descripcion.length}/500 caracteres
                </div>
              </div>

              {/* Categoría y Ubicación */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Categoría *</label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className={`form-select ${
                      camposFaltantes.includes("categoria") ? "is-invalid" : ""
                    }`}
                    disabled={isSubmitting}
                  >
                    <option value="electrico">Eléctrico</option>
                    <option value="hidraulico">Hidráulico</option>
                    <option value="sanitaria">Sanitaria</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Ubicación *</label>
                  <select
                    name="ubicacion_id"
                    value={formData.ubicacion_id}
                    onChange={handleChange}
                    className={`form-select ${
                      camposFaltantes.includes("ubicacion_id") ? "is-invalid" : ""
                    }`}
                    disabled={isSubmitting}
                  >
                    <option value="">Seleccione una ubicación</option>
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioridad */}
              <div className="mb-3">
                <label className="form-label fw-bold">Prioridad *</label>
                <select
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={handleChange}
                  className={`form-select ${
                    camposFaltantes.includes("prioridad") ? "is-invalid" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              {/* Archivos */}
              <div className="mb-3">
                <label className="form-label fw-bold">Archivos (Máx. 5)</label>
                <input
                  type="file"
                  className="form-control"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                <div className="form-text">
                  Se permiten imágenes o PDFs (máx. 5 archivos, 5MB cada uno)
                </div>

                {previews.length > 0 && (
                  <div className="mt-3 d-flex flex-wrap gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="position-relative">
                        <img
                          src={src}
                          alt={`Preview ${i + 1}`}
                          className="img-thumbnail"
                          style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0"
                          onClick={() => removerArchivo(i)}
                          disabled={isSubmitting}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="d-flex justify-content-between mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    backgroundColor: "#00482B",
                    color: "#FBE122",
                    fontWeight: "bold",
                    border: "none",
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Enviar Reporte"}
                </button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ReporteTipo;
