/**
 * @file asignacionesController.test.js
 * @description Pruebas unitarias del controlador de asignaciones con Jest y mocks.
 */

const { asignarResponsable, obtenerResponsables, obtenerMisAsignaciones, actualizarAsignacion } =
  require('../controllers/asignacionesController');
const pool = require('../db');

// 🧩 Mock del pool
jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(() => Promise.resolve({
    query: jest.fn(),
    release: jest.fn()
  }))
}));

// 🔧 Helper para mock de req/res
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockSocket = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};

describe('🧩 Controlador de Asignaciones', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==============================================
  // 🔹 TEST: asignarResponsable
  // ==============================================
  describe('asignarResponsable', () => {
    it('✅ debe asignar correctamente un incidente', async () => {
      const req = {
        body: {
          incidente_id: 1,
          responsable_id: 2,
          comentarios: 'Verificar sistema',
          fecha_cierre: '2025-10-30'
        },
        user: { id: 10 }, // supervisor
        app: { get: jest.fn(() => mockSocket) }
      };
      const res = mockResponse();

      // Mock de consultas
      pool.query
        // Incidente existe
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente', titulo: 'Fuga de agua' }] })
        // Responsable válido
        .mockResolvedValueOnce({
          rows: [{ responsable_id: 5, usuario_id: 2, nombre: 'Juan Pérez', email: 'jp@example.com' }]
        })
        // Nombre supervisor
        .mockResolvedValueOnce({ rows: [{ nombre: 'Carlos Gómez' }] })
        // Insert asignación
        .mockResolvedValueOnce({ rows: [{ id: 100, incidente_id: 1 }] })
        // Update incidente
        .mockResolvedValueOnce({ rows: [] })
        // Insert notificación
        .mockResolvedValueOnce({ rows: [] });

      await asignarResponsable(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Incidente asignado con éxito',
          asignacion: expect.any(Object),
          responsable: expect.any(Object)
        })
      );
      expect(mockSocket.to).toHaveBeenCalled();
    });

    it('❌ debe retornar error si el incidente no existe', async () => {
      const req = { body: { incidente_id: 1 }, user: { id: 1 }, app: { get: jest.fn() } };
      const res = mockResponse();

      pool.query.mockResolvedValueOnce({ rows: [] });

      await asignarResponsable(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Incidente no encontrado' }));
    });

    it('❌ debe retornar error si el responsable no es válido', async () => {
      const req = { body: { incidente_id: 1, responsable_id: 5 }, user: { id: 1 }, app: { get: jest.fn() } };
      const res = mockResponse();

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente', titulo: 'Incidente X' }] }) // incidente
        .mockResolvedValueOnce({ rows: [] }); // responsable no válido

      await asignarResponsable(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Responsable no válido o inactivo' }));
    });
  });

  // ==============================================
  // 🔹 TEST: obtenerResponsables
  // ==============================================
  describe('obtenerResponsables', () => {
    it('✅ debe retornar lista de responsables', async () => {
      const req = {};
      const res = mockResponse();

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, nombre: 'Juan', especialidad: 'eléctrico' }]
      });

      await obtenerResponsables(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it('❌ debe manejar error interno', async () => {
      const req = {};
      const res = mockResponse();

      pool.query.mockRejectedValueOnce(new Error('Error de conexión'));

      await obtenerResponsables(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error al obtener responsables' }));
    });
  });

  // ==============================================
  // 🔹 TEST: obtenerMisAsignaciones
  // ==============================================
  describe('obtenerMisAsignaciones', () => {
    it('✅ debe retornar asignaciones combinadas', async () => {
      const req = { user: { id: 2 } };
      const res = mockResponse();

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // responsable encontrado
        .mockResolvedValueOnce({ rows: [{ id: 10, titulo: 'Incidente 1', tipo_tarea: 'incidente' }] }) // incidentes
        .mockResolvedValueOnce({ rows: [{ id: 20, titulo: 'Mantenimiento 1', tipo_tarea: 'mantenimiento' }] }); // mantenimientos

      await obtenerMisAsignaciones(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it('⚠️ debe retornar vacío si el usuario no es responsable activo', async () => {
      const req = { user: { id: 3 } };
      const res = mockResponse();

      pool.query.mockResolvedValueOnce({ rows: [] }); // no responsable

      await obtenerMisAsignaciones(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  // ==============================================
  // 🔹 TEST: actualizarAsignacion
  // ==============================================
  describe('actualizarAsignacion', () => {
    it('✅ debe actualizar asignación de incidente y crear notificación', async () => {
      const client = {
        query: jest.fn(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValueOnce(client);

      const req = {
        params: { id: 100 },
        body: { estado: 'resuelto', comentarios: 'Listo', tipo: 'incidente' },
        user: { id: 2 },
        app: { get: jest.fn(() => mockSocket) }
      };
      const res = mockResponse();

      // Secuencia de queries simuladas
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // responsable
        .mockResolvedValueOnce({
          rows: [{
            id: 100,
            incidente_id: 50,
            solicitante_id: 30,
            solicitante_nombre: 'Mario',
            incidente_titulo: 'Alarma rota',
            acciones_tomadas: 'Revisada'
          }]
        }) // asignación actual
        .mockResolvedValueOnce({ rows: [{ id: 100, estado_asignacion: 'resuelto' }] }) // update asignación
        .mockResolvedValueOnce({ rows: [] }) // update incidente
        .mockResolvedValueOnce({ rows: [] }); // notificación

      await actualizarAsignacion(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Tarea actualizada con éxito'
      }));
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE asignaciones'), expect.any(Array));
      expect(mockSocket.to).toHaveBeenCalled();
    });

    it('❌ debe rechazar si no es responsable válido', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [] }), release: jest.fn() };
      pool.connect.mockResolvedValueOnce(client);

      const req = {
        params: { id: 100 },
        body: { estado: 'resuelto', tipo: 'incidente' },
        user: { id: 99 }
      };
      const res = mockResponse();

      await actualizarAsignacion(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'No eres un responsable válido' }));
    });

    it('❌ debe manejar error inesperado', async () => {
      const client = { query: jest.fn().mockRejectedValueOnce(new Error('Error fatal')), release: jest.fn() };
      pool.connect.mockResolvedValueOnce(client);

      const req = {
        params: { id: 1 },
        body: { estado: 'pendiente', tipo: 'incidente' },
        user: { id: 1 }
      };
      const res = mockResponse();

      await actualizarAsignacion(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
