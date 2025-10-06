import { useEffect, useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { OverlayTrigger, Tooltip, Modal, Badge, Button, Container, Card, Spinner, Alert } from 'react-bootstrap';
import facatativa2 from '../assets/facatativa-2.jpg';
import './CalendarioReportes.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

const estadoColores = {
  pendiente: '#FBE122',
  asignado: '#008C75',
  en_proceso: '#5bc0de',
  resuelto: '#28a745',
  completado: '#28a745'
};

const tiposValidos = ['eléctrico', 'mecánico', 'seguridad', 'otro'];

export default function CalendarioReportes({ auth }) {
  const [eventos, setEventos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [vista, setVista] = useState(Views.MONTH);
  const [errorCarga, setErrorCarga] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [showModalView, setShowModalView] = useState(false);
  const [fechaVista, setFechaVista] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000';

  const formatDate = (fecha) => {
    if (!fecha) return "No registrada";
    const d = new Date(fecha);
    return isNaN(d) ? 'Fecha inválida' : moment(d).format('DD [de] MMMM [de] YYYY, h:mm:ss a');
  };

  const calcularProximaFecha = (ultima, frecuencia) => {
    if (!ultima || !frecuencia) return 'No definida';
    let fecha = moment(ultima);
    switch (frecuencia?.toLowerCase()) {
      case 'diario': fecha.add(1, 'days'); break;
      case 'semanal': fecha.add(7, 'days'); break;
      case 'mensual': fecha.add(1, 'months'); break;
      case 'trimestral': fecha.add(3, 'months'); break;
      case 'anual': fecha.add(1, 'years'); break;
      default: return 'Frecuencia desconocida';
    }
    return fecha.format('DD/MM/YYYY');
  };

  const obtenerColorBadge = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'asignado': return 'info';
      case 'en_proceso': return 'primary';
      case 'resuelto':
      case 'completado': return 'success';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const [resReportes, resMantenimientos, resUbicaciones] = await Promise.all([
          axios.get(`${API_BASE_URL}/reportes`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/mantenimientos`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/ubicaciones`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const ubicacionesMap = (resUbicaciones.data || []).reduce((acc, u) => {
          acc[u.id] = u.nombre;
          return acc;
        }, {});
        setUbicaciones(resUbicaciones.data || []);

        const incidentes = (resReportes.data.incidentes || [])
          .filter(r => !['pendiente_verificacion', 'rechazado'].includes(r.estado))
          .map((reporte) => ({
            id: `I-${reporte.id}`,
            title: reporte.titulo,
            start: moment(reporte.fecha_creacion).startOf('day').toDate(),
            end: moment(reporte.fecha_creacion).endOf('day').toDate(),
            estado: reporte.estado,
            descripcion: reporte.descripcion,
            gravedad: reporte.gravedad,
            tipo: tiposValidos.includes(reporte.tipo) ? reporte.tipo : 'otro',
            categoria: 'incidente',
            fecha_creacion: reporte.fecha_creacion,
            fecha_asignacion: reporte.fecha_asignacion,
            fecha_cierre: reporte.fecha_cierre,
            solicitante_nombre: reporte.solicitante_nombre || reporte.reportante_nombre || 'No registrado',
            solicitante_apellido: reporte.solicitante_apellido || reporte.reportante_apellido || '',
            operario_nombre: reporte.operario_nombre || 'No asignado',
            supervisor_nombre: reporte.supervisor_nombre || 'No asignado',
            acciones_tomadas: reporte.acciones_tomadas || 'No registradas',
            ubicacion_nombre: reporte.ubicacion_id ? ubicacionesMap[reporte.ubicacion_id] : 'No registrada',
            allDay: true
          }));

        const mantenimientos = (resMantenimientos.data || []).map((m) => {
          const fechaEvento = m.estado === 'completado' && m.fecha_ultima_ejecucion
            ? m.fecha_ultima_ejecucion
            : m.fecha_programada;

          return {
            id: `M-${m.id}`,
            title: m.nombre,
            start: moment(fechaEvento).startOf('day').toDate(),
            end: moment(fechaEvento).endOf('day').toDate(),
            estado: m.estado,
            descripcion: m.descripcion,
            frecuencia: m.frecuencia,
            comentarios: m.comentarios,
            componente: m.componente_nombre || 'No especificado',
            dias: m.dias,
            responsable_nombre: m.responsable_nombre || 'No asignado',
            responsable_apellido: m.responsable_apellido || '',
            especialidad: m.especialidad || 'No asignado',
            categoria: 'mantenimiento',
            fecha_programada: m.fecha_programada,
            fecha_ultima_ejecucion: m.fecha_ultima_ejecucion,
            ubicacion_nombre: m.ubicacion_id ? ubicacionesMap[m.ubicacion_id] : 'No registrada',
            allDay: true
          };
        });

        setEventos([...incidentes, ...mantenimientos]);
        setErrorCarga(null);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setErrorCarga(error.message || 'Error al cargar datos.');
      } finally {
        setLoading(false);
      }
    };

    obtenerDatos();
  }, [navigate]);

  const conteoPorEstado = useMemo(() => {
    const start = moment(fechaVista).startOf(vista.toLowerCase());
    const end = moment(fechaVista).endOf(vista.toLowerCase());

    const incidentes = eventos
      .filter(e => e.categoria === 'incidente')
      .filter(e => moment(e.start).isBetween(start, end, null, '[]'))
      .reduce((acc, e) => { acc[e.estado] = (acc[e.estado] || 0) + 1; return acc; }, {});

    const mantenimientos = eventos
      .filter(e => e.categoria === 'mantenimiento')
      .filter(e => moment(e.start).isBetween(start, end, null, '[]'))
      .reduce((acc, e) => { acc[e.estado] = (acc[e.estado] || 0) + 1; return acc; }, {});

    return { incidentes, mantenimientos };
  }, [eventos, vista, fechaVista]);

  const eventStyleGetter = (event) => {
    let backgroundColor = '';
    let textColor = '';
    if (event.categoria === 'incidente') {
      backgroundColor = estadoColores[event.estado] || '#00482B';
      textColor = event.estado === 'pendiente' ? '#00482B' : 'white';
    } else if (event.categoria === 'mantenimiento') {
      backgroundColor = estadoColores.completado;
      textColor = 'white';
      if (event.estado === 'pendiente') {
        backgroundColor = estadoColores.pendiente;
        textColor = '#00482B';
      }
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        padding: '4px 8px',
        color: textColor,
        fontWeight: 'bold',
        border: `1px solid ${textColor}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        fontSize: '12px'
      }
    };
  };

  const onSelectEvent = (event) => {
    setViewData(event);
    setShowModalView(true);
  };

  const CustomEvent = ({ event }) => (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`tooltip-${event.id}`} style={{ zIndex: 9999 }}>
          <div>
            <strong>{event.title}</strong><br />
            <span>📌 {event.categoria}</span><br />
            {event.estado && <span>Estado: {event.estado}</span>}<br />
            {event.gravedad && <span>Gravedad: {event.gravedad}</span>}<br />
            {event.tipo && <span>Tipo: {event.tipo}</span>}<br />
            {event.descripcion && <span>Descripción: {event.descripcion.slice(0, 60)}...</span>}<br />
            <span>Ubicación: {event.ubicacion_nombre || 'No registrada'}</span>
          </div>
        </Tooltip>
      }
    >
      <div style={{ borderRadius: '6px', padding: '4px', textAlign: 'center', fontSize: '12px' }}>
        {event.title}
      </div>
    </OverlayTrigger>
  );

  const handleViewChange = (nuevaVista) => setVista(nuevaVista);
  const handleNavigate = (fecha) => setFechaVista(fecha);

  const CustomToolbar = (toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="d-flex justify-content-between mb-3 align-items-center">
        <div className="btn-group">
          <Button variant="outline-primary" onClick={goToBack}>Ant</Button>
          <Button variant="outline-primary" onClick={goToToday}>Hoy</Button>
          <Button variant="outline-primary" onClick={goToNext}>Sig</Button>
        </div>
        <h4 className="m-0 text-uppercase" style={{ color: '#00482B', fontWeight: 'bold' }}>{toolbar.label}</h4>
        <div>
          <select className="form-select" value={vista} onChange={(e) => handleViewChange(e.target.value)} style={{ borderColor: '#00482B', color: '#00482B' }}>
            <option value={Views.MONTH}>Mes</option>
            <option value={Views.WEEK}>Semana</option>
            <option value={Views.DAY}>Día</option>
          </select>
        </div>
      </div>
    );
  };

  const formats = {
    dayFormat: 'dddd DD/MM',
    weekdayFormat: 'dddd',
    eventTimeRangeFormat: () => '',
    timeGutterFormat: () => '',
    dayRangeHeaderFormat: ({ start, end }) => `${moment(start).format('DD/MM')} - ${moment(end).format('DD/MM')}`,
  };

  return (
    <Container fluid className="p-4" style={{ backgroundImage: `url(${facatativa2})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <Card className="shadow-lg p-4 border-0 rounded-4" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <h2 className="text-center mb-4 fw-bold" style={{ color: '#00482B' }}>📅 Calendario de Incidentes y Mantenimientos</h2>

        {loading && <div className="text-center my-5"><Spinner animation="border" variant="success" /></div>}
        {errorCarga && <Alert variant="danger" className="text-center">{errorCarga}</Alert>}

        {!loading && (
          <>
            <h5 className="mt-4">🛑 Incidentes</h5>
            <div className="d-flex flex-wrap gap-3 mb-4">
              {Object.entries(estadoColores).filter(([estado]) => estado !== 'completado').map(([estado, color]) => (
                <div key={estado} className="d-flex align-items-center gap-2">
                  <div style={{ width: '25px', height: '25px', backgroundColor: color, borderRadius: '5px' }} />
                  <span className="fw-semibold text-capitalize">{estado.replace('_', ' ')} ({conteoPorEstado.incidentes[estado] || 0})</span>
                </div>
              ))}
            </div>

            <h5>🛠 Mantenimientos</h5>
            <div className="d-flex flex-wrap gap-3 mb-4">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '25px', height: '25px', backgroundColor: estadoColores.pendiente, borderRadius: '5px' }} />
                <span className="fw-semibold">Pendiente ({conteoPorEstado.mantenimientos.pendiente || 0})</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '25px', height: '25px', backgroundColor: estadoColores.completado, borderRadius: '5px' }} />
                <span className="fw-semibold">Completado ({conteoPorEstado.mantenimientos.completado || 0})</span>
              </div>
            </div>

            <Calendar
              localizer={localizer}
              events={eventos}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 650, backgroundColor: 'white', borderRadius: '12px', padding: '10px' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={onSelectEvent}
              components={{ event: CustomEvent, toolbar: CustomToolbar }}
              onView={handleViewChange}
              view={vista}
              views={['month', 'week', 'day']}
              selectable
              onNavigate={handleNavigate}
              date={fechaVista}
              messages={{ month: 'Mes', week: 'Semana', day: 'Día' }}
              formats={formats}
              step={60}
              timeslots={1}
              className={vista !== Views.MONTH ? 'no-time-scroll' : ''}
            />
          </>
        )}

        <Modal show={showModalView} onHide={() => setShowModalView(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {viewData?.categoria === 'incidente' ? '🛑 Detalles del Incidente' : '📋 Detalles del Mantenimiento'}
            </Modal.Title>
          </Modal.Header>
          {viewData && (
            <Modal.Body>
              {viewData.categoria === 'incidente' ? (
                <>
                  <p><strong>Título:</strong> {viewData.title}</p>
                  <p><strong>Descripción:</strong> {viewData.descripcion || 'N/A'}</p>
                  <p><strong>Tipo:</strong> {viewData.tipo}</p>
                  <p><strong>Gravedad:</strong> <Badge bg={obtenerColorBadge(viewData.estado)}>{viewData.gravedad}</Badge></p>
                  <p><strong>Estado:</strong> <Badge bg={obtenerColorBadge(viewData.estado)}>{viewData.estado}</Badge></p>
                  <p><strong>Fecha Creación:</strong> {formatDate(viewData.fecha_creacion)}</p>
                  <p><strong>Fecha Asignación:</strong> {formatDate(viewData.fecha_asignacion)}</p>
                  <p><strong>Fecha Cierre:</strong> {formatDate(viewData.fecha_cierre)}</p>
                  <p><strong>Solicitante:</strong> {viewData.solicitante_nombre} {viewData.solicitante_apellido}</p>
                  <p><strong>Operario Asignado:</strong> {viewData.operario_nombre}</p>
                  <p><strong>Supervisor:</strong> {viewData.supervisor_nombre}</p>
                  <p><strong>Ubicación:</strong> {viewData.ubicacion_nombre || 'No registrada'}</p>
                  <p><strong>Acciones Tomadas:</strong> {viewData.acciones_tomadas}</p>
                </>
              ) : (
                <>
                  <p><strong>Nombre:</strong> {viewData.title}</p>
                  <p><strong>Descripción:</strong> {viewData.descripcion || 'N/A'}</p>
                  <p><strong>Fecha programada:</strong> {formatDate(viewData.fecha_programada)}</p>
                  <p><strong>Última ejecución:</strong> {formatDate(viewData.fecha_ultima_ejecucion)}</p>
                  <p><strong>Próxima ejecución:</strong> {calcularProximaFecha(viewData.fecha_ultima_ejecucion, viewData.frecuencia)}</p>
                  <p><strong>Estado:</strong> <Badge bg={obtenerColorBadge(viewData.estado)}>{viewData.estado}</Badge></p>
                  <p><strong>Frecuencia:</strong> <Badge bg={obtenerColorBadge(viewData.estado)}>{viewData.frecuencia}</Badge></p>
                  <p><strong>Comentarios:</strong> {viewData.comentarios || 'Ninguno'}</p>
                  <p><strong>Componente:</strong> {viewData.componente}</p>
                  <p><strong>Días:</strong> {viewData.dias}</p>
                  <p><strong>Responsable:</strong> {viewData.responsable_nombre} {viewData.responsable_apellido} ({viewData.especialidad})</p>
                  <p><strong>Ubicación:</strong> {viewData.ubicacion_nombre || 'No registrada'}</p>
                </>
              )}
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalView(false)}>Cerrar</Button>
          </Modal.Footer>
        </Modal>
      </Card>
    </Container>
  );
}
