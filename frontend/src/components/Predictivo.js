import React, { useEffect, useState } from 'react';

const Predictivo = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMantenimientos = async () => {
      try {
        const resp = await fetch('http://localhost:5000/predictivo/mantenimiento');
        const data = await resp.json();
        if (data.error) setError(data.error);
        else setMantenimientos(data.mantenimientos);
      } catch (err) {
        console.error(err);
        setError('Error al consultar el módulo predictivo');
      }
    };

    fetchMantenimientos();
  }, []);

  const formatDate = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Mantenimientos del mes con sugerencias</h2>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#4CAF50', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>ID</th>
              <th style={{ padding: '10px' }}>Nombre</th>
              <th style={{ padding: '10px' }}>Fecha Programada</th>
              <th style={{ padding: '10px' }}>Estado</th>
              <th style={{ padding: '10px' }}>Decisión</th>
              <th style={{ padding: '10px' }}>Razón</th>
            </tr>
          </thead>
          <tbody>
            {mantenimientos.map((m, index) => (
              <tr key={m.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                <td style={{ padding: '10px' }}>{m.id}</td>
                <td style={{ padding: '10px' }}>{m.nombre}</td>
                <td style={{ padding: '10px' }}>{formatDate(m.fecha_programada)}</td>
                <td style={{ padding: '10px', textTransform: 'capitalize' }}>{m.estado}</td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: m.decision === 'Reprogramar' ? '#d9534f' : m.decision === 'Adelantar' ? '#0275d8' : '#5cb85c' }}>
                  {m.decision}
                </td>
                <td style={{ padding: '10px' }}>{m.razon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Predictivo;
