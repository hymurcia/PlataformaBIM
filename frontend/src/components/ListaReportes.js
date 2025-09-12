import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Table,
  Pagination,
  Form,
  Spinner,
  Button,
  Modal,
  Badge,
  Image
} from 'react-bootstrap';

const ListaReportes = ({ auth }) => {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ estado: '' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const navigate = useNavigate();

  // Función para formatear fechas en formato: 3 de septiembre de 2025, 14:35:12
  const formatDate = (fecha) => {
    if (!fecha) return "N/A";
    const d = new Date(fecha);
    const opciones = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return d.toLocaleDateString('es-CO', opciones);
  };

  // Obtener reportes con paginación y filtros
  const fetchReportes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.estado && { estado: filters.estado }),
      };

      // Filtrar por usuario si rol es 2 o 3
      if ([2, 3].includes(auth.user?.rol_id)) {
        params.usuario_id = auth.user.id;
      }

      const res = await axios.get('http://localhost:5000/reportes', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setReportes(res.data.incidentes || []);
      setPagination(prev => ({
        ...prev,
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 0,
      }));
    } catch (error) {
      console.error('Error cargando reportes:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener imágenes asociadas a un reporte
  const fetchImagenes = async (idReporte) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:5000/reportes/${idReporte}/imagenes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setImagenes(res.data || []);
    } catch (error) {
      console.error('Error obteniendo imágenes:', error);
      setImagenes([]);
    }
  };

  // Mostrar modal con detalles y cargar imágenes
  const handleShowDetails = (reporte) => {
    setSelectedReport(reporte);
    fetchImagenes(reporte.id);
    setShowModal(true);
  };

  // Cambiar página
  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination(prev => ({ ...prev, page }));
  };

  // Cambiar filtros
  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Aplicar filtros y reiniciar página
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Recargar reportes cuando cambian página, filtro o autenticación
  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchReportes();
    }
  }, [pagination.page, filters.estado, auth?.isAuthenticated]);

  // Badge color según estado
  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'asignado': return 'primary';
      case 'en_proceso': return 'info';
      case 'resuelto': return 'success';
      default: return 'light';
    }
  };

  // Badge color según gravedad
  const getGravedadColor = (gravedad) => {
    switch (gravedad) {
      case 'baja': return 'success';
      case 'media': return 'warning';
      case 'alta': return 'danger';
      case 'critica': return 'dark';
      default: return 'secondary';
    }
  };

  return (
    <Container className="mt-4">
      <Card className="shadow">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h2>Lista de Reportes</h2>
          {auth.user?.rol_id === 2 && (
            <Button variant="light" onClick={() => navigate('/admin/tareas')}>
              Panel Administración
            </Button>
          )}
        </Card.Header>

        <Card.Body>
          {/* Filtros */}
          <Form className="mb-4 p-3 border rounded">
            <h5>Filtros</h5>
            <Form.Group className="mb-3" controlId="filterEstado">
              <Form.Label>Estado</Form.Label>
              <Form.Select
                name="estado"
                value={filters.estado}
                onChange={handleFilterChange}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="asignado">Asignado</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" onClick={applyFilters} disabled={loading}>
              Aplicar
            </Button>
          </Form>

          {/* Estado de carga */}
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Cargando reportes...</p>
            </div>
          ) : (
            <>
              {/* Tabla de reportes */}
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Fecha Creación</th>
                      <th>Gravedad</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.length ? (
                      reportes.map(reporte => (
                        <tr key={reporte.id}>
                          <td>{reporte.id}</td>
                          <td>{reporte.titulo}</td>
                          <td>{reporte.tipo}</td>
                          <td>{reporte.ubicacion_nombre}</td>
                          <td>{formatDate(reporte.fecha_creacion)}</td>
                          <td>
                            <Badge bg={getGravedadColor(reporte.gravedad)}>
                              {reporte.gravedad}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getBadgeColor(reporte.estado)}>
                              {reporte.estado.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleShowDetails(reporte)}
                            >
                              Detalles
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No se encontraron reportes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Paginación */}
              {pagination.total > 0 && (
                <div className="d-flex justify-content-between mt-3 align-items-center">
                  <div>
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} reportes
                  </div>
                  <Pagination>
                    <Pagination.First
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    />
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <Pagination.Item
                          key={pageNum}
                          active={pageNum === pagination.page}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal con detalles e imágenes */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Reporte #{selectedReport?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport ? (
            <>
              <p><strong>Título:</strong> {selectedReport.titulo}</p>
              <p><strong>Descripción:</strong> {selectedReport.descripcion}</p>
              <p><strong>Tipo:</strong> {selectedReport.tipo}</p>
              <p><strong>Ubicación:</strong> {selectedReport.ubicacion_nombre}</p>
              <p><strong>Solicitante:</strong> {selectedReport.solicitante_nombre || "N/A"}</p>
              <p><strong>Operario Asignado:</strong> {selectedReport.operario_nombre || "N/A"}</p>
              <p><strong>Supervisor:</strong> {selectedReport.supervisor_nombre || "N/A"}</p>
              <p><strong>Fecha Creación:</strong> {formatDate(selectedReport.fecha_creacion)}</p>
              <p><strong>Fecha Asignación:</strong> {formatDate(selectedReport.fecha_asignacion)}</p>
              <p><strong>Fecha Cierre:</strong> {formatDate(selectedReport.fecha_cierre)}</p>
              <p>
                <strong>Gravedad:</strong>{' '}
                <Badge bg={getGravedadColor(selectedReport.gravedad)}>
                  {selectedReport.gravedad}
                </Badge>
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                <Badge bg={getBadgeColor(selectedReport.estado)}>
                  {selectedReport.estado.replace('_', ' ')}
                </Badge>
              </p>
              <p><strong>Acciones Tomadas:</strong> {selectedReport.acciones_tomadas || "No registradas"}</p>
              <hr />
              <h5>Imágenes</h5>
              {imagenes.length > 0 ? (
                <div className="d-flex flex-wrap gap-3">
                  {imagenes.map((img, idx) => {
                    const imgUrl = `http://localhost:5000/uploads/${img.url}`;
                    return (
                      <Image
                        key={idx}
                        src={imgUrl}
                        alt={`Imagen ${idx + 1}`}
                        thumbnail
                        style={{ maxHeight: '150px', cursor: 'pointer' }}
                        onClick={() => setPreviewImg(imgUrl)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p>No hay imágenes disponibles para este reporte.</p>
              )}
            </>
          ) : (
            <p>Cargando detalles...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de vista previa de imagen */}
      <Modal show={!!previewImg} onHide={() => setPreviewImg(null)} centered size="lg">
        <Modal.Body className="text-center">
          {previewImg && (
            <img
              src={previewImg}
              alt="Vista previa"
              style={{ width: "100%", borderRadius: "10px" }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ListaReportes;
