import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, Card, Spinner } from "react-bootstrap";
import faca12 from "../assets/faca12.jpg";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const ReporteTipo = ({ auth }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'otro',
    ubicacion_id: '',
    prioridad: 'media',
    archivos: []
  });
  const [ubicaciones, setUbicaciones] = useState([]);
  const [error, setError] = useState("");
  const [camposFaltantes, setCamposFaltantes] = useState([]);
  const [success, setSuccess] = useState("");
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/ubicaciones`)
      .then(res => setUbicaciones(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = e => {
    const files = Array.from(e.target.files).slice(0, 5);
    previews.forEach(url => URL.revokeObjectURL(url));
    const previewUrls = files.filter(f => f.type.startsWith("image/"))
                             .map(f => URL.createObjectURL(f));
    setPreviews(previewUrls);
    setFormData(prev => ({ ...prev, archivos: files }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCamposFaltantes([]);

    const faltantes = [];
    if (!formData.titulo.trim()) faltantes.push("titulo");
    if (!formData.descripcion.trim()) faltantes.push("descripcion");
    if (!formData.categoria.trim()) faltantes.push("categoria");
    if (!formData.ubicacion_id) faltantes.push("ubicacion_id");
    if (!formData.prioridad.trim()) faltantes.push("prioridad");

    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setError("Complete los campos requeridos");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("titulo", formData.titulo);
      fd.append("descripcion", formData.descripcion);
      fd.append("tipo", formData.categoria);
      fd.append("ubicacion_id", formData.ubicacion_id);
      fd.append("gravedad", formData.prioridad);
      formData.archivos.forEach(file => fd.append("imagenes", file));

      await axios.post(`${API_BASE_URL}/reportes/invitado`, fd, {
        headers: { "Content-Type": "multipart/form-data", "user-id": auth?.isAuthenticated ? auth.user.id : "" }
      });

      setSuccess("Reporte enviado con éxito");
      setFormData({ titulo:'', descripcion:'', categoria:'otro', ubicacion_id:'', prioridad:'media', archivos:[] });
      setPreviews([]);
      setCamposFaltantes([]);
      setError("");
      setTimeout(() => navigate("/reporte/invitado"), 2000);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.error || "Error al enviar reporte");
      if (resp?.camposFaltantes) setCamposFaltantes(resp.camposFaltantes);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="mt-4">
      <Card className="shadow">
        <Card.Header className="text-white" style={{ backgroundColor: '#DAAA00' }}>
          <h2>Reporte Tipo</h2>
        </Card.Header>
        <Card.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {camposFaltantes.length > 0 && (
            <div className="alert alert-warning">
              Complete: {camposFaltantes.join(", ")}
            </div>
          )}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Título *</label>
              <input type="text" name="titulo" className={`form-control ${camposFaltantes.includes("titulo") ? "is-invalid" : ""}`} value={formData.titulo} onChange={handleChange} disabled={isSubmitting}/>
            </div>

            <div className="mb-3">
              <label className="form-label">Descripción *</label>
              <textarea name="descripcion" className={`form-control ${camposFaltantes.includes("descripcion") ? "is-invalid" : ""}`} value={formData.descripcion} onChange={handleChange} disabled={isSubmitting}/>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Categoría *</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange} className="form-select" disabled={isSubmitting}>
                  <option value="electrico">Eléctrico</option>
                  <option value="hidraulico">Hidráulico</option>
                  <option value="sanitaria">Sanitaria</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Ubicación *</label>
                <select name="ubicacion_id" value={formData.ubicacion_id} onChange={handleChange} className="form-select" disabled={isSubmitting}>
                  <option value="">Seleccione ubicación</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Prioridad *</label>
              <select name="prioridad" value={formData.prioridad} onChange={handleChange} className="form-select" disabled={isSubmitting}>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Archivos (Máx. 5)</label>
              <input type="file" className="form-control" multiple accept="image/*,application/pdf" onChange={handleFileChange} disabled={isSubmitting}/>
              <div className="mt-2 d-flex flex-wrap gap-2">
                {previews.map((src,i) => <img key={i} src={src} alt="preview" className="img-thumbnail" style={{width:'100px',height:'100px',objectFit:'cover'}}/>)}
              </div>
            </div>

            <button type="submit" className="btn btn-lg text-white" style={{backgroundColor:'#DAAA00', border:'none', fontWeight:'bold'}} disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReporteTipo;
