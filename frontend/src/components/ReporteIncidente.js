import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReporteTipo = () => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'electrico', // Valor inicial sin tilde
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
    const fetchUbicaciones = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await axios.get('http://localhost:5000/ubicaciones', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUbicaciones(res.data);
      } catch (err) {
        setError('Error cargando ubicaciones');
      }
    };
    fetchUbicaciones();
  }, [navigate]);

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = e => {
    const files = Array.from(e.target.files).slice(0, 5);
    setFormData(prev => ({ ...prev, archivos: files }));

    previews.forEach(url => URL.revokeObjectURL(url));
    const previewUrls = files.filter(f => f.type.startsWith('image/')).map(f => URL.createObjectURL(f));
    setPreviews(previewUrls);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCamposFaltantes([]);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Usuario no autenticado');
        navigate('/login');
        return;
      }

      const data = new FormData();
      data.append('titulo', formData.titulo);
      data.append('descripcion', formData.descripcion);
      data.append('tipo', formData.categoria);
      data.append('ubicacion_id', formData.ubicacion_id);
      data.append('gravedad', formData.prioridad);

      formData.archivos.forEach(file => data.append('imagenes', file));

      const response = await axios.post('http://localhost:5000/reportes', data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Reporte enviado con éxito');
      setFormData({ titulo: '', descripcion: '', categoria: 'electrico', ubicacion_id: '', prioridad: 'media', archivos: [] });
      setPreviews([]);
      setCamposFaltantes([]);
      setError('');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.camposFaltantes) {
        setCamposFaltantes(resData.camposFaltantes);
        setError(resData.error || 'Faltan campos requeridos');
      } else {
        setError(resData?.error || 'Error al enviar reporte');
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-info text-white"><h2>Reporte Tipo</h2></div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {camposFaltantes.length > 0 && (
            <div className="alert alert-warning">
              <strong>Por favor complete los siguientes campos:</strong>
              <ul>{camposFaltantes.map(c => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Título *</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleChange}
                className={`form-control ${camposFaltantes.includes('titulo') ? 'is-invalid' : ''}`} required />
            </div>

            <div className="mb-3">
              <label className="form-label">Descripción *</label>
              <textarea name="descripcion" rows="4" value={formData.descripcion} onChange={handleChange}
                className={`form-control ${camposFaltantes.includes('descripcion') ? 'is-invalid' : ''}`} required />
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Categoría *</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange}
                  className={`form-select ${camposFaltantes.includes('tipo') ? 'is-invalid' : ''}`} required>
                  <option value="electrico">Eléctrico</option>
                  <option value="hidraulico">Hidráulico</option>
                  <option value="sanitaria">Sanitaria</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Ubicación *</label>
                <select name="ubicacion_id" value={formData.ubicacion_id} onChange={handleChange}
                  className={`form-select ${camposFaltantes.includes('ubicacion_id') ? 'is-invalid' : ''}`} required>
                  <option value="">Seleccione una ubicación</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Prioridad *</label>
              <select name="prioridad" value={formData.prioridad} onChange={handleChange}
                className={`form-select ${camposFaltantes.includes('gravedad') ? 'is-invalid' : ''}`} required>
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Archivos (Máx. 5)</label>
              <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="form-control" />
              {previews.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="Preview" className="img-thumbnail" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                  ))}
                </div>
              )}
            </div>

            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-info btn-lg">Enviar Reporte</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteTipo;
