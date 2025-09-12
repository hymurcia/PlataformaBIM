import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Spinner, Table, Button, Form, Modal, Row, Col, Badge } from 'react-bootstrap';

const frecuenciaColores = {
  Diario: 'info',
  Semanal: 'primary',
  Mensual: 'secondary',
  Trimestral: 'warning',
  Anual: 'success',
};

const estadoColores = {
  pendiente: 'warning',
  completado: 'success',
  en_progreso: 'primary',
  cancelado: 'danger'
};

const Mantenimientos = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [componentes, setComponentes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    descripcion: '',
    frecuencia: '',
    fecha_programada: '',
    operario_id: '',
    componente_id: '',
    ubicacion_id: '',
    dias: '',
    comentarios: ''
  });

  const [showModalEdit, setShowModalEdit] = useState(false);
  const [showModalView, setShowModalView] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewData, setViewData] = useState(null);

  // Obtener token y headers
  const token = localStorage.getItem('token');
  const headers = { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    obtenerMantenimientos();
    obtenerResponsables();
    obtenerComponentes();
    obtenerUbicaciones();
  }, []);

  const obtenerMantenimientos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/mantenimientos', { headers });
      setMantenimientos(res.data);
    } catch (error) {
      console.error('Error al obtener mantenimientos', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerResponsables = async () => {
    try {
      const res = await axios.get('http://localhost:5000/asignaciones/responsables', { headers });
      setResponsables(res.data || []);
    } catch (error) {
      console.error('Error al obtener responsables', error);
    }
  };

  const obtenerComponentes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/componentes', { headers });
      setComponentes(res.data);
    } catch (error) {
      console.error('Error al obtener componentes', error);
    }
  };

  const obtenerUbicaciones = async () => {
    try {
      const res = await axios.get('http://localhost:5000/ubicaciones', { headers });
      setUbicaciones(res.data);
    } catch (error) {
      console.error('Error al obtener ubicaciones', error);
    }
  };

  const handleChange = (e) => setNuevo({ ...nuevo, [e.target.name]: e.target.value });

  const crearMantenimiento = async (e) => {
    e.preventDefault();
    try {
      if (!nuevo.componente_id && !nuevo.ubicacion_id) {
        alert('Debe especificar un componente o una ubicación');
        return;
      }

      await axios.post('http://localhost:5000/mantenimientos', nuevo, { headers });
      setNuevo({
        nombre: '',
        descripcion: '',
        frecuencia: '',
        fecha_programada: '',
        operario_id: '',
        componente_id: '',
        ubicacion_id: '',
        dias: '',
        comentarios: ''
      });
      obtenerMantenimientos();
    } catch (error) {
      console.error('Error al crear mantenimiento', error);
      alert('Error al crear mantenimiento: ' + (error.response?.data?.error || error.message));
    }
  };

  const eliminarMantenimiento = async (id) => {
    if (!window.confirm('¿Eliminar este mantenimiento?')) return;
    try {
      await axios.delete(`http://localhost:5000/mantenimientos/${id}`, { headers });
      obtenerMantenimientos();
    } catch (error) {
      console.error('Error al eliminar mantenimiento', error);
      alert('Error al eliminar mantenimiento: ' + (error.response?.data?.error || error.message));
    }
  };

  // Formatear fecha a "10 septiembre 2025"
  const formatDate = (fecha) => {
    if (!fecha) return 'No registrada';
    const d = new Date(fecha);
    if (isNaN(d)) return 'Fecha inválida';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const calcularProximaFecha = (ultima, frecuencia) => {
    if (!ultima || !frecuencia) return 'No definida';
    let fecha = new Date(ultima);
    switch (frecuencia.toLowerCase()) {
      case 'diario': fecha.setDate(fecha.getDate() + 1); break;
      case 'semanal': fecha.setDate(fecha.getDate() + 7); break;
      case 'mensual': fecha.setMonth(fecha.getMonth() + 1); break;
      case 'trimestral': fecha.setMonth(fecha.getMonth() + 3); break;
      case 'anual': fecha.setFullYear(fecha.getFullYear() + 1); break;
      default: return 'Frecuencia desconocida';
    }
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const obtenerNombreComponente = (id) => {
    const componente = componentes.find(c => c.id === id);
    return componente ? componente.nombre : 'Sin componente';
  };

  const obtenerNombreUbicacion = (id) => {
    const ubicacion = ubicaciones.find(u => u.id === id);
    return ubicacion ? ubicacion.nombre : 'Sin ubicación';
  };

  const abrirModalEditar = (m) => {
    setEditData({
      ...m,
      fecha_programada: m.fecha_programada ? m.fecha_programada.split('T')[0] : '',
      fecha_ultima_ejecucion: m.fecha_ultima_ejecucion ? m.fecha_ultima_ejecucion.split('T')[0] : ''
    });
    setShowModalEdit(true);
  };

  const abrirModalVer = (m) => {
    setViewData(m);
    setShowModalView(true);
  };

  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const guardarEdicion = async () => {
    try {
      if (!editData.componente_id && !editData.ubicacion_id) {
        alert('Debe especificar un componente o una ubicación');
        return;
      }

      await axios.put(`http://localhost:5000/mantenimientos/${editData.id}`, editData, { headers });
      setShowModalEdit(false);
      obtenerMantenimientos();
    } catch (error) {
      console.error('Error al actualizar mantenimiento', error);
      alert('Error al actualizar mantenimiento: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return (
    <div className="text-center mt-5">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Cargando mantenimientos...</p>
    </div>
  );

  return (
    <div className="container mt-4">
      <h4 className="mb-3">➕ Nuevo Mantenimiento</h4>
      <Form onSubmit={crearMantenimiento} className="p-3 border rounded shadow-sm bg-light mb-4">
        <Row className="g-2">
          <Col md={3}>
            <Form.Control type="text" placeholder="Nombre *" name="nombre" value={nuevo.nombre} onChange={handleChange} required />
          </Col>
          <Col md={2}>
            <Form.Select name="frecuencia" value={nuevo.frecuencia} onChange={handleChange} required>
              <option value="">Frecuencia *</option>
              <option value="Diario">Diario</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Anual">Anual</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Control type="date" name="fecha_programada" value={nuevo.fecha_programada} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Select name="operario_id" value={nuevo.operario_id} onChange={handleChange}>
              <option value="">Responsable</option>
              {responsables.map(res => (
                <option key={res.usuario_id} value={res.usuario_id}>
                  {res.nombre} {res.apellido} ({res.especialidad})
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Control type="text" placeholder="Descripción" name="descripcion" value={nuevo.descripcion} onChange={handleChange} />
          </Col>
        </Row>
        
        <Row className="g-2 mt-2">
          <Col md={3}>
            <Form.Select name="componente_id" value={nuevo.componente_id} onChange={handleChange}>
              <option value="">Seleccionar componente (opcional)</option>
              {componentes.map(comp => (
                <option key={comp.id} value={comp.id}>{comp.nombre}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Select name="ubicacion_id" value={nuevo.ubicacion_id} onChange={handleChange}>
              <option value="">Seleccionar ubicación (opcional)</option>
              {ubicaciones.map(ub => (
                <option key={ub.id} value={ub.id}>{ub.nombre}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Control type="number" placeholder="Días" name="dias" value={nuevo.dias} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Form.Control type="text" placeholder="Comentarios" name="comentarios" value={nuevo.comentarios} onChange={handleChange} />
          </Col>
          <Col md={2}>
            <Button type="submit" variant="success" className="w-100">Guardar</Button>
          </Col>
        </Row>
        <small className="text-muted">* Debe especificar al menos un componente o una ubicación</small>
      </Form>

      <Table striped bordered hover responsive className="shadow-sm align-middle text-center">
        <thead className="table-primary">
          <tr>
            <th>Nombre</th>
            <th>Frecuencia</th>
            <th>Última ejecución</th>
            <th>Próxima</th>
            <th>Componente</th>
            <th>Ubicación</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th style={{ width: '200px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {mantenimientos.map(m => (
            <tr key={m.id}>
              <td>{m.nombre}</td>
              <td>
                <Badge bg={frecuenciaColores[m.frecuencia] || 'secondary'}>{m.frecuencia}</Badge>
              </td>
              <td>{formatDate(m.fecha_ultima_ejecucion)}</td>
              <td>{calcularProximaFecha(m.fecha_ultima_ejecucion, m.frecuencia)}</td>
              <td>{obtenerNombreComponente(m.componente_id)}</td>
              <td>{obtenerNombreUbicacion(m.ubicacion_id)}</td>
              <td>
                {m.responsable_nombre && m.responsable_apellido 
                  ? `${m.responsable_nombre} ${m.responsable_apellido}`
                  : 'No asignado'
                }
              </td>
              <td>
                <Badge bg={estadoColores[m.estado] || 'secondary'}>{m.estado}</Badge>
              </td>
              <td>
                <div className="d-flex gap-2 justify-content-center">
                  <Button variant="info" size="sm" onClick={() => abrirModalVer(m)}>👁️ Ver</Button>
                  <Button variant="warning" size="sm" onClick={() => abrirModalEditar(m)}>✏️ Editar</Button>
                  <Button variant="danger" size="sm" onClick={() => eliminarMantenimiento(m.id)}>🗑️ Eliminar</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal Editar */}
      <Modal show={showModalEdit} onHide={() => setShowModalEdit(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>✏️ Editar Mantenimiento</Modal.Title></Modal.Header>
        {editData && (
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre *</Form.Label>
                    <Form.Control type="text" name="nombre" value={editData.nombre} onChange={handleEditChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Frecuencia *</Form.Label>
                    <Form.Select name="frecuencia" value={editData.frecuencia} onChange={handleEditChange} required>
                      <option value="Diario">Diario</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Mensual">Mensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Descripción</Form.Label>
                <Form.Control as="textarea" rows={2} name="descripcion" value={editData.descripcion} onChange={handleEditChange} />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Fecha programada</Form.Label>
                    <Form.Control type="date" name="fecha_programada" value={editData.fecha_programada} onChange={handleEditChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Última ejecución</Form.Label>
                    <Form.Control type="date" name="fecha_ultima_ejecucion" value={editData.fecha_ultima_ejecucion} onChange={handleEditChange} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Componente</Form.Label>
                    <Form.Select name="componente_id" value={editData.componente_id} onChange={handleEditChange}>
                      <option value="">Seleccionar componente</option>
                      {componentes.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.nombre}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Ubicación</Form.Label>
                    <Form.Select name="ubicacion_id" value={editData.ubicacion_id} onChange={handleEditChange}>
                      <option value="">Seleccionar ubicación</option>
                      {ubicaciones.map(ub => (
                        <option key={ub.id} value={ub.id}>{ub.nombre}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Responsable</Form.Label>
                    <Form.Select name="operario_id" value={editData.operario_id} onChange={handleEditChange}>
                      <option value="">Seleccionar responsable</option>
                      {responsables.map(res => (
                        <option key={res.usuario_id} value={res.usuario_id}>
                          {res.nombre} {res.apellido} ({res.especialidad})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estado</Form.Label>
                    <Form.Select name="estado" value={editData.estado} onChange={handleEditChange}>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="completado">Completado</option>
                      <option value="cancelado">Cancelado</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Días</Form.Label>
                    <Form.Control type="number" name="dias" value={editData.dias} onChange={handleEditChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Comentarios</Form.Label>
                    <Form.Control type="text" name="comentarios" value={editData.comentarios} onChange={handleEditChange} />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEdit(false)}>Cancelar</Button>
          <Button variant="primary" onClick={guardarEdicion}>Guardar cambios</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Ver */}
      <Modal show={showModalView} onHide={() => setShowModalView(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>📋 Detalles del Mantenimiento</Modal.Title></Modal.Header>
        {viewData && (
          <Modal.Body>
            <Row>
              <Col md={6}>
                <p><strong>Nombre:</strong> {viewData.nombre}</p>
                <p><strong>Descripción:</strong> {viewData.descripcion || 'N/A'}</p>
                <p><strong>Frecuencia:</strong> <Badge bg={frecuenciaColores[viewData.frecuencia] || 'secondary'}>{viewData.frecuencia}</Badge></p>
                <p><strong>Estado:</strong> <Badge bg={estadoColores[viewData.estado] || 'secondary'}>{viewData.estado}</Badge></p>
                <p><strong>Componente:</strong> {obtenerNombreComponente(viewData.componente_id)}</p>
              </Col>
              <Col md={6}>
                <p><strong>Ubicación:</strong> {obtenerNombreUbicacion(viewData.ubicacion_id)}</p>
                <p><strong>Fecha programada:</strong> {formatDate(viewData.fecha_programada)}</p>
                <p><strong>Última ejecución:</strong> {formatDate(viewData.fecha_ultima_ejecucion)}</p>
                <p><strong>Próxima ejecución:</strong> {calcularProximaFecha(viewData.fecha_ultima_ejecucion, viewData.frecuencia)}</p>
                <p><strong>Días:</strong> {viewData.dias || 'N/A'}</p>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <p><strong>Responsable:</strong> {viewData.responsable_nombre && viewData.responsable_apellido 
                  ? `${viewData.responsable_nombre} ${viewData.responsable_apellido} (${viewData.especialidad || 'Sin especialidad'})`
                  : 'No asignado'}</p>
                <p><strong>Comentarios:</strong> {viewData.comentarios || 'Ninguno'}</p>
              </Col>
            </Row>
          </Modal.Body>
        )}
        <Modal.Footer><Button variant="secondary" onClick={() => setShowModalView(false)}>Cerrar</Button></Modal.Footer>
      </Modal>
    </div>
  );
};

export default Mantenimientos;
