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
        `http://localhost:5000/asignaciones/${selectedTarea.tarea_id}`,
        { estado: formData.estado, comentarios: formData.comentarios },
        { headers: { Authorization: `Bearer ${token}` } }
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
    setLoadingDetalle(true);
    setErrorDetalle(null);
    setDetalleIncidente(null);
    setImagenes([]);
    setShowDetalle(true);

    const tareaId = tarea.tarea_id;
    if (!tareaId) {
      setErrorDetalle('No se pudo determinar el ID de la asignación.');
      setLoadingDetalle(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // ✅ Pedimos detalle por asignación
      const resDetalle = await axios.get(
        `http://localhost:5000/incidentes/asignacion/${tareaId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const detalle = resDetalle.data;
      setDetalleIncidente(detalle);

      // ✅ Pedimos imágenes con el ID del incidente real
      if (detalle && detalle.id) {
        const resImagenes = await axios.get(
          `http://localhost:5000/incidentes/${detalle.id}/imagenes`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setImagenes(resImagenes.data || []);
      }
    } catch (err) {
      console.error('❌ Error al obtener detalles del incidente:', err);
      setErrorDetalle('No se pudieron cargar los detalles del incidente.');
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
                <p>
                  <strong>Título:</strong> {selectedTarea.titulo}
                </p>
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Estado *</Form.Label>
              <Form.Select
                value={formData.estado}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
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
          {!loadingDetalle && detalleIncidente && (
            <>
              <Table bordered>
                <tbody>
                  <tr>
                    <th>ID Incidente</th>
                    <td>{detalleIncidente.id}</td>
                  </tr>
                  <tr>
                    <th>Título</th>
                    <td>{detalleIncidente.titulo}</td>
                  </tr>
                  <tr>
                    <th>Descripción</th>
                    <td>{detalleIncidente.descripcion || '-'}</td>
                  </tr>
                  <tr>
                    <th>Tipo</th>
                    <td>{detalleIncidente.tipo || '-'}</td>
                  </tr>
                  <tr>
                    <th>Ubicación</th>
                    <td>
                      {detalleIncidente.ubicacion_nombre ||
                        detalleIncidente.ubicacion_id ||
                        '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>Gravedad</th>
                    <td>{detalleIncidente.gravedad || '-'}</td>
                  </tr>
                  <tr>
                    <th>Estado</th>
                    <td>
                      <Badge
                        bg={getBadgeColor(
                          detalleIncidente.estado_asignacion ||
                            detalleIncidente.estado
                        )}
                      >
                        {detalleIncidente.estado_asignacion ||
                          detalleIncidente.estado ||
                          '-'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>Responsable</th>
                    <td>{detalleIncidente.responsable_nombre || '-'}</td>
                  </tr>
                  <tr>
                    <th>Supervisor</th>
                    <td>{detalleIncidente.supervisor_nombre || '-'}</td>
                  </tr>
                  <tr>
                    <th>Fecha asignación</th>
                    <td>
                      {formatDate(
                        detalleIncidente.fecha_asignacion ||
                          detalleIncidente.fecha_creacion
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Fecha cierre</th>
                    <td>{formatDate(detalleIncidente.fecha_cierre)}</td>
                  </tr>
                  <tr>
                    <th>Acciones tomadas</th>
                    <td>{detalleIncidente.acciones_tomadas || '-'}</td>
                  </tr>
                  <tr>
                    <th>Comentarios</th>
                    <td>{detalleIncidente.comentarios_asignacion || '-'}</td>
                  </tr>
                </tbody>
              </Table>

              {/* Imágenes */}
              {imagenes.length > 0 ? (
                <div className="d-flex flex-wrap gap-3 mt-2">
                  {imagenes.map((img) => {
                    const imgUrl = `http://localhost:5000/uploads/${img.url}`;
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
                          <div className="small text-muted mt-1">
                            {img.descripcion}
                          </div>
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
          {!loadingDetalle && !detalleIncidente && !errorDetalle && (
            <p>No se encontraron detalles.</p>
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
