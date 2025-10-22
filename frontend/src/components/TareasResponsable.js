import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Spinner } from 'react-bootstrap';
import TablaIncidentes from './TablaIncidentes';
import TablaMantenimientos from './TablaMantenimientos';
import facatativa2 from "../assets/facatativa-2.jpg"; // 🔹 Imagen de fondo

const TareasResponsable = ({ auth }) => {
  const [tareas, setTareas] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchTareas();
    }
  }, [auth]);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/asignaciones/mis-asignaciones',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTareas(response.data.filter(t => t.tipo_tarea === 'incidente'));
      setMantenimientos(
        response.data.filter(t => t.tipo_tarea === 'mantenimiento' && t.estado === 'pendiente')
      );
    } catch (err) {
      console.error('❌ Error al cargar tareas:', err);
      setError('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        paddingTop: '30px',
        paddingBottom: '30px'
      }}
    >
      <Container>
        <Card className="shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
          {/* 🔸 Encabezado con color amarillo personalizado */}
          <Card.Header
            style={{
              backgroundColor: '#FBE122',
              color: 'black',
              fontWeight: 'bold'
            }}
          >
            <h2>Mis Asignaciones</h2>
          </Card.Header>

          <Card.Body>
            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="info" />
                <p className="mt-2">Cargando datos...</p>
              </div>
            ) : (
              <>
                <TablaIncidentes tareas={tareas} recargar={fetchTareas} />
                <TablaMantenimientos mantenimientos={mantenimientos} recargar={fetchTareas} />
              </>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default TareasResponsable;
