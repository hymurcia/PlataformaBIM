import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Modal, Form, Card, Container, Spinner } from 'react-bootstrap';
import axios from 'axios';
import API_BASE_URL from '../utils/config';

const TablaMantenimientos = ({ mantenimientos, recargar }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [formData, setFormData] = useState({ estado: '', comentarios: '' });
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📌 Cargar ubicaciones al montar
  useEffect(() => {
    const cargarUbicaciones = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/ubicaciones`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUbicaciones(response.data);
      } catch (err) {
        console.error('❌ Error al cargar ubicaciones:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarUbicaciones();
  }, []);

  const handleUpdateClick = (tarea) => {
    setSelectedTarea(tarea);
    setFormData({
      estado: tarea.estado || 'pendiente',
      comentarios: tarea.comentarios || ''
    });
    setShowModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/mantenimientos/${selectedTarea.tarea_id}/estado`,
        { estado: formData.estado, comentarios: formData.comentarios },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      recargar();
    } catch (err) {
      console.error('❌ Error al actualizar mantenimiento:', err);
    }
  };

  const handleVerDetalles = (tarea) => {
    setSelectedTarea(tarea);
    setShowDetalleModal(true);
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'completado': return 'success';
      case 'en_proceso': return 'info';
      default: return 'secondary';
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <Container className="mt-4">
      <Card className="shadow-lg p-4 rounded-4" style={{ backgroundColor: "#f8f9fa" }}>
        <h4 className="mb-4 text-center" style={{ color: "#00482B", fontWeight: "bold" }}>
          🛠️ Mantenimientos Pendientes
        </h4>

        {mantenimientos.length > 0 ? (
          <Table striped bordered hover responsive className="align-middle">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Programado para</th>
                <th>Ubicación</th>
                <th>Tiempo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mantenimientos.map((m) => (
                <tr key={`mantenimiento-${m.tarea_id}`}>
                  <td>{m.tarea_id}</td>
                  <td>{m.titulo || m.nombre}</td>
                  <td>{m.descripcion}</td>
                  <td>
                    <Badge bg={getBadgeColor(m.estado)}>
                      {m.estado || 'pendiente'}
                    </Badge>
                  </td>
                  <td>{m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : '—'}</td>
                  <td>{m.ubicacion_nombre || 'Sin ubicación'}</td>
                  <td>
                    {m.dias_retraso > 0 ? (
                      <Badge bg="danger">Retrasado {m.dias_retraso} día(s)</Badge>
                    ) : (
                      <Badge bg="success">A tiempo</Badge>
                    )}
                  </td>
                  <td className="d-flex gap-2 flex-wrap">
                    <Button variant="outline-info" size="sm" onClick={() => handleVerDetalles(m)}>Ver Detalles</Button>
                    <Button variant="outline-primary" size="sm" onClick={() => handleUpdateClick(m)}>Actualizar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="alert alert-secondary text-center">
            No tienes mantenimientos pendientes
          </div>
        )}
      </Card>

      {/* MODAL ACTUALIZAR */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Mantenimiento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            {selectedTarea && (
              <div className="mb-3">
                <h5>Mantenimiento #{selectedTarea.tarea_id}</h5>
                <p><strong>Título:</strong> {selectedTarea.titulo || selectedTarea.nombre}</p>
                <p><strong>Descripción:</strong> {selectedTarea.descripcion}</p>
                <p><strong>Ubicación:</strong> {selectedTarea.ubicacion_nombre || 'Sin ubicación'}</p>
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Estado *</Form.Label>
              <Form.Select
                name="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                required
              >
                <option value="en_proceso">En proceso</option>
                <option value="completado">Completado</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comentarios</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="comentarios"
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                placeholder="Describe las acciones tomadas..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Cambios</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL DETALLES */}
      <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Mantenimiento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTarea && (
            <Table bordered responsive>
              <tbody>
                <tr>
                  <th>Nombre</th>
                  <td>{selectedTarea.titulo || selectedTarea.nombre}</td>
                </tr>
                <tr>
                  <th>Descripción</th>
                  <td>{selectedTarea.descripcion}</td>
                </tr>
                <tr>
                  <th>Frecuencia</th>
                  <td>{selectedTarea.frecuencia || '—'}</td>
                </tr>
                <tr>
                  <th>Fecha Programada</th>
                  <td>{selectedTarea.fecha_programada ? new Date(selectedTarea.fecha_programada).toLocaleDateString() : '—'}</td>
                </tr>
                <tr>
                  <th>Fecha Última Ejecución</th>
                  <td>{selectedTarea.fecha_ultima_ejecucion ? new Date(selectedTarea.fecha_ultima_ejecucion).toLocaleString() : '—'}</td>
                </tr>
                <tr>
                  <th>Estado</th>
                  <td><Badge bg={getBadgeColor(selectedTarea.estado)}>{selectedTarea.estado}</Badge></td>
                </tr>
                <tr>
                  <th>Comentarios</th>
                  <td>{selectedTarea.comentarios || '—'}</td>
                </tr>
                {selectedTarea.componente_nombre && selectedTarea.componente_nombre !== 'No asignado' && (
                  <tr>
                    <th>Componente</th>
                    <td>{selectedTarea.componente_nombre}</td>
                  </tr>
                )}
                <tr>
                  <th>Ubicación</th>
                  <td>{selectedTarea.ubicacion_nombre || 'Sin ubicación'}</td>
                </tr>
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TablaMantenimientos;
