import React, { useState } from 'react';
import { Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import axios from 'axios';

const TablaMantenimientos = ({ mantenimientos, recargar }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [formData, setFormData] = useState({ estado: '', comentarios: '' });

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
        `http://localhost:5000/mantenimientos/${selectedTarea.tarea_id}/estado`,
        { estado: formData.estado, comentarios: formData.comentarios },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowModal(false);
      recargar();
    } catch (err) {
      console.error('❌ Error al actualizar mantenimiento:', err);
    }
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'completado': return 'success';
      case 'en_proceso': return 'info';
      default: return 'light';
    }
  };

  return (
    <>
      <h4 className="mt-4 mb-3">🛠️ Mantenimientos Pendientes</h4>
      {mantenimientos.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Programado para</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mantenimientos.map((m) => (
              <tr key={`mantenimiento-${m.tarea_id}`}>
                <td>{m.tarea_id}</td>
                <td>{m.titulo}</td>
                <td>{m.descripcion}</td>
                <td>
                  <Badge bg={getBadgeColor(m.estado)}>
                    {m.estado || 'pendiente'}
                  </Badge>
                </td>
                <td>
                  {m.fecha_asignacion
                    ? new Date(m.fecha_asignacion).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleUpdateClick(m)}
                  >
                    Actualizar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="alert alert-secondary">
          No tienes mantenimientos pendientes
        </div>
      )}

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Mantenimiento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            {selectedTarea && (
              <div className="mb-3">
                <h5>Mantenimiento #{selectedTarea.tarea_id}</h5>
                <p><strong>Título:</strong> {selectedTarea.titulo}</p>
                <p><strong>Descripción:</strong> {selectedTarea.descripcion}</p>
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
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar Cambios
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default TablaMantenimientos;
