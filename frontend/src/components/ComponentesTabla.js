import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ComponentesTable = () => {
  const [componentes, setComponentes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('');

  const token = localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      setLoading(true);
      const resComp = await axios.get('http://localhost:5000/componentes', { headers });
      const resUb = await axios.get('http://localhost:5000/ubicaciones', { headers });
      setComponentes(resComp.data);
      setUbicaciones(resUb.data);
    } catch (err) {
      setError('Error al cargar componentes o ubicaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const nombreUbicacion = (id) => {
    const ub = ubicaciones.find((u) => u.id === id);
    return ub ? ub.nombre : 'Sin ubicación';
  };

  const estadoRevision = (c) => {
    const vidaUtil = c.vida_util_meses || 0;
    const edad = c.edad_actual || 0;
    if (!vidaUtil) return { color: 'bg-secondary', texto: 'Sin datos' };

    const porcentajeVida = edad / vidaUtil;
    if (porcentajeVida >= 1) return { color: 'bg-danger', texto: 'Revisión inmediata' };
    if (porcentajeVida >= 0.8) return { color: 'bg-warning text-dark', texto: 'Revisión próxima' };
    return { color: 'bg-success', texto: 'En buen estado' };
  };

  // Filtrar por ubicación
  const componentesFiltrados = filtroUbicacion
    ? componentes.filter((c) => c.ubicacion_id === parseInt(filtroUbicacion))
    : componentes;

  const cantidadFiltrados = componentesFiltrados.length;

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">🧩 Lista de Componentes</h4>

      {/* Filtro de ubicación */}
      <div className="mb-3 d-flex align-items-center gap-2">
        <label className="form-label mb-0">Filtrar por ubicación:</label>
        <select
          className="form-select w-auto"
          value={filtroUbicacion}
          onChange={(e) => setFiltroUbicacion(e.target.value)}
        >
          <option value="">Todas</option>
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
        {filtroUbicacion && (
          <span className="badge bg-info text-dark">
            {cantidadFiltrados} componentes en esta ubicación
          </span>
        )}
      </div>

      {loading && <div className="alert alert-info">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

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
          {componentesFiltrados.length > 0 ? (
            componentesFiltrados.map(c => {
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
                  <td><span className={`badge ${revision.color}`}>{revision.texto}</span></td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan="6" className="text-center">No hay componentes</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ComponentesTable;
