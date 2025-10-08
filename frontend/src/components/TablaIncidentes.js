// src/components/TablaIncidentes.js
import React, { useState } from 'react';
import { Table, Button, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const estadoColores = {
  pendiente: 'warning',
  pendiente_verificacion: 'secondary',
  asignado: 'primary',
  en_proceso: 'info',
  resuelto: 'success',
  rechazado: 'danger'
};

const TablaIncidentes = ({ tareas, recargar }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [detalleIncidente, setDetalleIncidente] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const [formData, setFormData] = useState({ estado: '', comentarios: '' });
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

  // ===== MODAL DE ACTUALIZAR =====
  const handleUpdateClick = (tarea) => {
    setSelectedTarea(tarea);
    setFormData({
      estado: tarea.estado_asignacion || 'en_proceso',
      comentarios: tarea.comentarios_asignacion || ''
    });
    setShowModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/asignaciones/${selectedTarea.tarea_id}`,
        {
          estado: formData.estado,
          comentarios: formData.comentarios,
          tipo: "incidente"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setShowModal(false);
      recargar();
    } catch (err) {
      console.error('❌ Error al actualizar incidente:', err);
      alert('Error al actualizar incidente. Revisa la consola.');
    }
  };

  // ===== MODAL DE DETALLES =====
  const handleDetalleClick = async (tarea) => {
    setShowDetalle(true);
    setErrorDetalle(null);
    setPreviewImg(null);
    setImagenes([]);

    // Usamos directamente los datos de la tarea (ya vienen del backend completo)
    setDetalleIncidente(tarea);

    try {
      const token = localStorage.getItem('token');
      // Solo pedimos imágenes actualizadas
      const resImagenes = await axios.get(
        `${API_BASE_URL}/incidentes/${tarea.incidente_id}/imagenes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setImagenes(resImagenes.data || []);
    } catch (err) {
      console.error('⚠️ Error cargando imágenes:', err);
      setImagenes([]);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleCerrarDetalle = () => {
    setShowDetalle(false);
    setDetalleIncidente(null);
    setImagenes([]);
    setPreviewImg(null);
    setErrorDetalle(null);
  };

  const formatDate = (fecha) => {
    if (!fecha) return 'No disponible';
    const d = new Date(fecha);
    return isNaN(d) ? 'Fecha inválida' : d.toLocaleString();
  };

  const getBadgeColor = (estado) => estadoColores[estado] || 'light';

  return (
    <>
      <h4 className="mb-3">📌 Incidentes Asignados</h4>

      {tareas.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map((t) => (
              <tr key={`incidente-${t.tarea_id}`}>
                <td>{t.tarea_id}</td>
                <td>{t.titulo}</td>
                <td>
                  <Badge bg={getBadgeColor(t.estado_asignacion)}>
                    {t.estado_asignacion || 'pendiente'}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleUpdateClick(t)}
                    className="me-2"
                  >
                    Actualizar
                  </Button>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handleDetalleClick(t)}
                  >
                    Ver Detalles
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="alert alert-info">No tienes incidentes asignados</div>
      )}

      {/* MODAL DE ACTUALIZAR */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Incidente</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            {selectedTarea && (
              <div className="mb-3">
                <h5>Incidente #{selectedTarea.tarea_id}</h5>
                <p><strong>Título:</strong> {selectedTarea.titulo}</p>
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Estado *</Form.Label>
              <Form.Select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                required
              >
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Comentarios</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.comentarios}
                onChange={(e) =>
                  setFormData({ ...formData, comentarios: e.target.value })
                }
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

      {/* MODAL DE DETALLES */}
      <Modal show={showDetalle} onHide={handleCerrarDetalle} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Incidente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingDetalle && (
            <div className="text-center">
              <Spinner animation="border" size="sm" className="me-2" /> Cargando detalles...
            </div>
          )}
          {errorDetalle && <Alert variant="danger">{errorDetalle}</Alert>}
          {detalleIncidente && (
            <>
              <Table bordered>
                <tbody>
                  <tr><th>ID Incidente</th><td>{detalleIncidente.incidente_id}</td></tr>
                  <tr><th>Título</th><td>{detalleIncidente.titulo}</td></tr>
                  <tr><th>Descripción</th><td>{detalleIncidente.descripcion}</td></tr>
                  <tr><th>Ubicación</th><td>{detalleIncidente.ubicacion_nombre}</td></tr>
                  <tr><th>Gravedad</th><td>{detalleIncidente.gravedad || '-'}</td></tr>
                  <tr><th>Responsable</th><td>{detalleIncidente.responsable_nombre}</td></tr>
                  <tr><th>Supervisor</th><td>{detalleIncidente.supervisor_nombre}</td></tr>
                  <tr><th>Estado</th>
                    <td><Badge bg={getBadgeColor(detalleIncidente.estado_asignacion)}>{detalleIncidente.estado_asignacion}</Badge></td>
                  </tr>
                  <tr><th>Fecha asignación</th><td>{formatDate(detalleIncidente.fecha_asignacion)}</td></tr>
                  <tr><th>Acciones tomadas</th><td>{detalleIncidente.acciones_tomadas || '-'}</td></tr>
                  <tr><th>Comentarios</th><td>{detalleIncidente.comentarios_asignacion}</td></tr>
                </tbody>
              </Table>

              {/* IMÁGENES */}
              {imagenes.length > 0 ? (
                <div className="d-flex flex-wrap gap-3 mt-2">
                  {imagenes.map((img) => {
                    const imgUrl = `${API_BASE_URL}/uploads/${img.url}`;
                    return (
                      <div key={img.id} className="text-center">
                        <img
                          src={imgUrl}
                          alt={img.descripcion || 'Imagen asociada'}
                          style={{
                            maxWidth: '150px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPreviewImg(imgUrl)}
                          onError={() =>
                            console.error('⚠️ Error cargando imagen:', img)
                          }
                        />
                        {img.descripcion && (
                          <div className="small text-muted mt-1">{img.descripcion}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No hay imágenes asociadas.</p>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal de preview de imagen */}
      <Modal show={!!previewImg} onHide={() => setPreviewImg(null)} centered size="lg">
        <Modal.Body className="text-center">
          {previewImg && (
            <img
              src={previewImg}
              alt="Vista previa"
              style={{ width: '100%', borderRadius: '10px' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default TablaIncidentes;
