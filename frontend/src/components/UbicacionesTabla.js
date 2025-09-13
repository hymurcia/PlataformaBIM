import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UbicacionesTable = () => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
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

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">📍 Lista de Ubicaciones</h4>
      {loading && <div className="alert alert-info">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

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
  );
};

export default UbicacionesTable;
