import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const PanelBim = () => {
  const [tab, setTab] = useState('componentes');
  const [componentes, setComponentes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  // --- Fetch data ---
  const fetchComponentes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/componentes', { headers });
      setComponentes(res.data);
    } catch (err) {
      setError('Error al cargar componentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUbicaciones = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/ubicaciones', { headers });
      setUbicaciones(res.data);
    } catch (err) {
      setError('Error cargando ubicaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMantenimientos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/mantenimientos', { headers });
      setMantenimientos(res.data);
    } catch (err) {
      setError('Error al cargar mantenimientos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'componentes') fetchComponentes();
    if (tab === 'ubicaciones') fetchUbicaciones();
    if (tab === 'mantenimientos') fetchMantenimientos();
  }, [tab]);

  // --- Funciones para nombres ---
  const nombreUbicacion = (id) => {
    const ub = ubicaciones.find((u) => u.id === id);
    return ub ? ub.nombre : 'Sin ubicación';
  };

  const nombreComponente = (id) => {
    const comp = componentes.find((c) => c.id === id);
    return comp ? comp.nombre : 'Sin componente';
  };

  // --- Función para determinar color y recomendación de revisión ---
  const estadoRevision = (componente) => {
    if (componente.estado_revision) {
      // Si el backend ya envió el estado
      const texto = componente.estado_revision;
      let color = 'bg-secondary';
      if (texto === 'Revisión inmediata') color = 'bg-danger';
      else if (texto === 'Revisión próxima') color = 'bg-warning text-dark';
      else if (texto === 'Operativo' || texto === 'En buen estado') color = 'bg-success';
      return { color, texto };
    }

    // Cálculo local como respaldo
    const vidaUtil = componente.vida_util_meses || 0;
    const edad = componente.edad_actual || 0;

    if (!vidaUtil) return { color: 'bg-secondary', texto: 'Sin datos' };

    const porcentajeVida = edad / vidaUtil;
    if (porcentajeVida >= 1) return { color: 'bg-danger', texto: 'Revisión inmediata' };
    if (porcentajeVida >= 0.8) return { color: 'bg-warning text-dark', texto: 'Revisión próxima' };
    return { color: 'bg-success', texto: 'En buen estado' };
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4 text-center">📊 Panel BIM</h1>

      {/* Tabs */}
      <div className="d-flex justify-content-center mb-4">
        <button
          className={`btn me-2 ${tab === 'componentes' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('componentes')}
        >
          Componentes
        </button>
        <button
          className={`btn me-2 ${tab === 'ubicaciones' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('ubicaciones')}
        >
          Ubicaciones
        </button>
        <button
          className={`btn ${tab === 'mantenimientos' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setTab('mantenimientos')}
        >
          Mantenimientos
        </button>
      </div>

      {/* Alerts */}
      {loading && <div className="alert alert-info">Cargando datos...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Componentes */}
      {tab === 'componentes' && (
        <div className="card shadow-sm p-3">
          <h4 className="mb-3">🧩 Lista de Componentes</h4>
          <table className="table table-hover table-bordered">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Revisión</th>
              </tr>
            </thead>
            <tbody>
              {componentes.length > 0 ? (
                componentes.map(c => {
                  const revision = estadoRevision(c);
                  return (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.nombre}</td>
                      <td>{c.descripcion}</td>
                      <td>{nombreUbicacion(c.ubicacion_id)}</td>
                      <td>
                        <span className={`badge ${c.estado === 'activo' ? 'bg-success' : 'bg-secondary'}`}>
                          {c.estado}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${revision.color}`}>
                          {revision.texto}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="6" className="text-center">No hay componentes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ubicaciones */}
      {tab === 'ubicaciones' && (
        <div className="card shadow-sm p-3">
          <h4 className="mb-3">📍 Lista de Ubicaciones</h4>
          <table className="table table-hover table-bordered">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Área</th>
                <th>Bloque</th>
                <th>Piso</th>
                <th>Salón</th>
              </tr>
            </thead>
            <tbody>
              {ubicaciones.length > 0 ? (
                ubicaciones.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nombre}</td>
                    <td>{u.area}</td>
                    <td>{u.bloque}</td>
                    <td>{u.piso}</td>
                    <td>{u.salon}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center">No hay ubicaciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mantenimientos */}
      {tab === 'mantenimientos' && (
        <div className="card shadow-sm p-3">
          <h4 className="mb-3">🛠️ Lista de Mantenimientos</h4>
          <table className="table table-hover table-bordered">
            <thead className="table-light">
              <tr>
                <th>ID</th>
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
              {mantenimientos.length > 0 ? (
                mantenimientos.map(m => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.nombre}</td>
                    <td>{m.descripcion}</td>
                    <td><span className="badge bg-info text-dark">{m.frecuencia}</span></td>
                    <td>
                      {m.responsable_nombre && m.responsable_apellido 
                        ? `${m.responsable_nombre} ${m.responsable_apellido}`
                        : 'Sin asignar'}
                    </td>
                    <td>{m.componente_id ? nombreComponente(m.componente_id) : 'Mantenimiento general'}</td>
                    <td>
                      {m.ubicacion_nombre 
                        ? `${m.ubicacion_nombre}${m.ubicacion_bloque ? ` - Bloque ${m.ubicacion_bloque}` : ''}${m.ubicacion_piso ? ` - Piso ${m.ubicacion_piso}` : ''}${m.ubicacion_salon ? ` - Salón ${m.ubicacion_salon}` : ''}`
                        : (m.componente_id ? 'A través de componente' : 'Sin ubicación')}
                    </td>
                    <td>{m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : 'No programado'}</td>
                    <td>{m.fecha_ultima_ejecucion ? new Date(m.fecha_ultima_ejecucion).toLocaleDateString() : 'Nunca ejecutado'}</td>
                    <td>
                      <span className={`badge ${
                        m.estado === 'pendiente' ? 'bg-warning text-dark' : 
                        m.estado === 'completado' ? 'bg-success' : 
                        m.estado === 'en_progreso' ? 'bg-primary' : 'bg-secondary'
                      }`}>{m.estado}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="10" className="text-center">No hay mantenimientos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PanelBim;
