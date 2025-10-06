import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Spinner,
  Badge,
  Alert,
  Row,
  Col
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import facatativa2 from '../assets/facatativa-2.jpg';
import escudoColor from '../assets/ESCUDO COLOR.png';

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const AdminTareas = ({ auth }) => {
  const [incidentes, setIncidentes] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAsignar, setShowAsignar] = useState(false);
  const [selectedIncidente, setSelectedIncidente] = useState(null);
  const [formData, setFormData] = useState({
    responsable_id: '',
    comentarios: '',
    fecha_finalizacion: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.rol_id === 2) {
      fetchData();
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const [incidentesRes, responsablesRes, ubicacionesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/reportes?estado=pendiente`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/asignaciones/responsables`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/ubicaciones`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setIncidentes(incidentesRes.data.incidentes || []);
      setResponsables(responsablesRes.data || []);
      setUbicaciones(ubicacionesRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarClick = (incidente) => {
    setSelectedIncidente(incidente);
    setFormData({ responsable_id: '', comentarios: '', fecha_finalizacion: '' });
    setError('');
    setShowAsignar(true);
  };

  const handleAsignarSubmit = async (e) => {
    e.preventDefault();
    const { responsable_id, fecha_finalizacion } = formData;

    if (!responsable_id) return setError('Debe seleccionar un responsable.');
    if (!fecha_finalizacion) return setError('Debe establecer una fecha de finalización.');

    const hoy = new Date().setHours(0, 0, 0, 0);
    const fechaSeleccionada = new Date(fecha_finalizacion).setHours(0, 0, 0, 0);
    if (fechaSeleccionada < hoy) return setError('La fecha de finalización no puede ser anterior a hoy.');

    try {
      const token = localStorage.getItem('token');

      // Payload ajustado para incluir supervisor_asignador_id
      const payload = {
        incidente_id: selectedIncidente.id,
        responsable_id: Number(formData.responsable_id), // Responsable asignado
        supervisor_asignador_id: auth.user.id,        // Supervisor logueado
        comentarios: formData.comentarios,
        fecha_finalizacion
      };

      await axios.post(`${API_BASE_URL}/asignaciones`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      closeModal();
      fetchData();
    } catch (err) {
      console.error('Error al asignar:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Error al asignar tarea.');
    }
  };

  const handleEliminar = async (incidente) => {
    if (!window.confirm(`¿Está seguro de eliminar el incidente #${incidente.id}?`)) return;

    try {
      const token = localStorage.getItem('token');

      await axios.put(`${API_BASE_URL}/incidentes/${incidente.id}/eliminar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchData();
    } catch (err) {
      console.error('Error al eliminar:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Error al eliminar incidente.');
    }
  };

  const closeModal = () => {
    setShowAsignar(false);
    setSelectedIncidente(null);
    setFormData({ responsable_id: '', comentarios: '', fecha_finalizacion: '' });
    setError('');
  };

  const formatDate = (fecha) => {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const getUbicacionNombre = (ubicacion_id) =>
    ubicaciones.find(u => u.id === ubicacion_id)?.nombre || '-';

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'pendiente': return 'danger';
      case 'asignado': return 'warning';
      case 'en_proceso': return 'primary';
      case 'resuelto':
      case 'completado': return 'success';
      default: return 'secondary';
    }
  };

  const getBadgeGravedad = (gravedad) => {
    switch (gravedad) {
      case 'alta': return 'danger';
      case 'media': return 'warning';
      case 'baja': return 'success';
      case 'critica': return 'dark';
      default: return 'light';
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${facatativa2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 1,
        }}
      ></div>
      <Container className="my-5" style={{ zIndex: 2 }}>
        <Card className="shadow-lg border-0" style={{ borderRadius: "15px", backgroundColor: "rgba(255, 255, 255, 0.9)" }}>
          <Card.Header className="text-white py-3" style={{ backgroundColor: "#00482B", borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}>
            <Row className="align-items-center">
              <Col xs="auto" className="d-flex align-items-center">
                <img src={escudoColor} alt="Escudo" style={{ height: "35px", marginRight: "10px" }} />
                <h2 className="mb-0" style={{ color: "#FBE122", fontWeight: "bold" }}>
                  Panel de Asignación de Incidentes
                </h2>
              </Col>
            </Row>
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" style={{ color: "#00482B" }} />
                <p className="mt-2">Cargando datos...</p>
              </div>
            ) : (
              <>
                <h4 className="mb-4" style={{ color: "#00482B" }}>Incidentes Pendientes de Asignación</h4>
                {incidentes.length > 0 ? (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Tipo</th>
                        <th>Ubicación</th>
                        <th>Gravedad</th>
                        <th>Estado</th>
                        <th>Fecha creación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentes.map((incidente) => (
                        <tr key={incidente.id}>
                          <td>{incidente.id}</td>
                          <td>{incidente.titulo}</td>
                          <td>{incidente.tipo}</td>
                          <td>{getUbicacionNombre(incidente.ubicacion_id)}</td>
                          <td>
                            <Badge bg={getBadgeGravedad(incidente.gravedad)}>
                              {incidente.gravedad}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getBadgeEstado(incidente.estado)}>
                              {incidente.estado}
                            </Badge>
                          </td>
                          <td>{formatDate(incidente.fecha_creacion)}</td>
                          <td>
                            <Button
                              style={{ backgroundColor: "#FBE122", borderColor: "#FBE122", color: "#00482B", fontWeight: "bold" }}
                              size="sm"
                              disabled={incidente.estado !== 'pendiente'}
                              onClick={() => handleAsignarClick(incidente)}
                              className="me-2"
                            >
                              Asignar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={incidente.estado === 'eliminado'}
                              onClick={() => handleEliminar(incidente)}
                            >
                              Eliminar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">No hay incidentes pendientes de asignación.</Alert>
                )}
              </>
            )}
          </Card.Body>
        </Card>

        {/* Modal Asignar Responsable */}
        <Modal show={showAsignar} onHide={closeModal}>
          <Modal.Header closeButton style={{ backgroundColor: "#00482B" }}>
            <Modal.Title style={{ color: "#FBE122" }}>Asignar Responsable</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleAsignarSubmit}>
            <Modal.Body>
              {selectedIncidente && (
                <>
                  <h5>Incidente #{selectedIncidente.id}</h5>
                  <p><strong>Título:</strong> {selectedIncidente.titulo}</p>
                  <p><strong>Descripción:</strong> {selectedIncidente.descripcion}</p>
                  <p><strong>Ubicación:</strong> {getUbicacionNombre(selectedIncidente.ubicacion_id)}</p>
                </>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Responsable *</Form.Label>
                <Form.Select
                  value={formData.responsable_id}
                  onChange={(e) => setFormData({ ...formData, responsable_id: e.target.value })}
                  required
                >
                  <option value="">Seleccione un responsable</option>
                  {responsables.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.nombre} ({res.especialidad})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Comentarios/Instrucciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Fecha estimada de finalización *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.fecha_finalizacion}
                  onChange={(e) => setFormData({ ...formData, fecha_finalizacion: e.target.value })}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button
                style={{ backgroundColor: "#FBE122", borderColor: "#FBE122", color: "#00482B", fontWeight: "bold" }}
                type="submit"
              >
                Asignar Tarea
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminTareas;
