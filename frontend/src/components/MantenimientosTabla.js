import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MantenimientosTable = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [componentes, setComponentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      setLoading(true);
      const resM = await axios.get('http://localhost:5000/mantenimientos', { headers });
      const resC = await axios.get('http://localhost:5000/componentes', { headers });
      setMantenimientos(resM.data);
      setComponentes(resC.data);
    } catch (err) {
      setError('Error al cargar mantenimientos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const nombreComponente = (id) => {
    const comp = componentes.find((c) => c.id === id);
    return comp ? comp.nombre : 'Sin componente';
  };

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">🛠️ Lista de Mantenimientos</h4>
      {loading && <div className="alert alert-info">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

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
                <td>{m.componente_id ? nombreComponente(m.componente_id) : 'General'}</td>
                <td>
                  {m.ubicacion_nombre 
                    ? `${m.ubicacion_nombre}${m.ubicacion_bloque ? ` - Bloque ${m.ubicacion_bloque}` : ''}${m.ubicacion_piso ? ` - Piso ${m.ubicacion_piso}` : ''}${m.ubicacion_salon ? ` - Salón ${m.ubicacion_salon}` : ''}`
                    : (m.componente_id ? 'A través de componente' : 'Sin ubicación')}
                </td>
                <td>{m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : 'No programado'}</td>
                <td>{m.fecha_ultima_ejecucion ? new Date(m.fecha_ultima_ejecucion).toLocaleDateString() : 'Nunca'}</td>
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
  );
};

export default MantenimientosTable;
