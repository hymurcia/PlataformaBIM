import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReporteTipo = ({ auth }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'otro',  // Valor por defecto compatible con el ENUM
    ubicacion_id: '',
    prioridad: 'media',  
    archivos: []
  });

  const [ubicaciones, setUbicaciones] = useState([]);
  const [error, setError] = useState('');
  const [camposFaltantes, setCamposFaltantes] = useState([]);
  const [success, setSuccess] = useState('');
  const [previews, setPreviews] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/ubicaciones')
      .then(res => setUbicaciones(res.data))
      .catch(err => console.error('Error cargando ubicaciones:', err));
  }, []);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setFormData(prev => ({ ...prev, archivos: files }));

    previews.forEach(url => URL.revokeObjectURL(url));

    const previewUrls = files
      .filter(file => file.type.startsWith('image/'))
      .map(file => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCamposFaltantes([]);

    const faltantes = [];
    if (!formData.titulo.trim()) faltantes.push('titulo');
    if (!formData.descripcion.trim()) faltantes.push('descripcion');
    if (!formData.categoria.trim()) faltantes.push('tipo');
    if (!formData.ubicacion_id) faltantes.push('ubicacion_id');
    if (!formData.prioridad.trim()) faltantes.push('gravedad');

    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setError('Por favor complete los campos requeridos.');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('titulo', formData.titulo);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('tipo', formData.categoria); // coincide con ENUM
      formDataToSend.append('ubicacion_id', formData.ubicacion_id);
      formDataToSend.append('gravedad', formData.prioridad);

      formData.archivos.forEach(file => {
        formDataToSend.append('imagenes', file);
      });

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'user-id': auth?.isAuthenticated ? auth.user.id : ''
        }
      };

      await axios.post('http://localhost:5000/reportes/invitado', formDataToSend, config);

      setSuccess('Reporte enviado con éxito');
      setFormData({
        titulo: '',
        descripcion: '',
        categoria: 'otro',
        ubicacion_id: '',
        prioridad: 'media',
        archivos: []
      });
      setPreviews([]);
      setCamposFaltantes([]);
      setError('');

      setTimeout(() => navigate('/reporte/invitado'), 2000);
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.camposFaltantes) {
        setCamposFaltantes(responseData.camposFaltantes);
        setError(responseData.error || 'Faltan campos requeridos');
      } else {
        setError(responseData?.error || 'Error al enviar reporte');
      }
      console.error('Error al enviar:', err.response?.data || err.message);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header text-white" style={{ backgroundColor: '#DAAA00' }}>
          <h2>Reporte Tipo</h2>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {camposFaltantes.length > 0 && (
            <div className="alert alert-warning">
              <strong>Por favor complete los siguientes campos:</strong>
              <ul>
                {camposFaltantes.map(campo => (
                  <li key={campo}>{campo}</li>
                ))}
              </ul>
            </div>
          )}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Título *</label>
              <input
                type="text"
                className={`form-control ${camposFaltantes.includes('titulo') ? 'is-invalid' : ''}`}
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Descripción *</label>
              <textarea
                className={`form-control ${camposFaltantes.includes('descripcion') ? 'is-invalid' : ''}`}
                name="descripcion"
                rows="4"
                value={formData.descripcion}
                onChange={handleChange}
                required
              />
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Categoría *</label>
                <select
                  className={`form-select ${camposFaltantes.includes('tipo') ? 'is-invalid' : ''}`}
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="electrico">Eléctrico</option>
                  <option value="hidraulico">Hidráulico</option>
                  <option value="sanitaria">Sanitaria</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Ubicación *</label>
                <select
                  className={`form-select ${camposFaltantes.includes('ubicacion_id') ? 'is-invalid' : ''}`}
                  name="ubicacion_id"
                  value={formData.ubicacion_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione una ubicación</option>
                  {ubicaciones.map(ubic => (
                    <option key={ubic.id} value={ubic.id}>
                      {ubic.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Prioridad *</label>
              <select
                className={`form-select ${camposFaltantes.includes('gravedad') ? 'is-invalid' : ''}`}
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                required
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Archivos (Máx. 5)</label>
              <input
                type="file"
                className="form-control"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
              <div className="text-muted small">
                Adjunte imágenes o documentos relevantes (opcional)
              </div>

              {previews.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Previsualización"
                      className="img-thumbnail"
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="d-grid gap-2">
              <button
                type="submit"
                className="btn btn-lg text-white"
                style={{ backgroundColor: '#DAAA00', border: 'none', fontWeight: 'bold', transition: '0.3s' }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#b98b00')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#DAAA00')}
              >
                Enviar Reporte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteTipo;
