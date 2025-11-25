// tests/notificaciones.test.js
const {
  setSocket,
  crearNotificacion,
  obtenerNotificaciones,
  marcarLeida,
} = require("../controllers/notificacionesController");
const pool = require("../db");

// 🧱 Mock de la conexión a BD
jest.mock("../db", () => ({
  query: jest.fn(),
}));

// 🧱 Mock del objeto Socket.IO
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
const mockIO = { to: mockTo };

// 🧱 Mocks de req y res
const mockReq = (body = {}, params = {}) => ({ body, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  setSocket(mockIO); // inyectamos el socket simulado
});

describe("NotificacionesController", () => {
  // ===================================
  // 🔹 crearNotificacion
  // ===================================
  describe("crearNotificacion", () => {
    it("debe crear una notificación correctamente y emitir por socket", async () => {
      const req = mockReq({
        usuario_id: 1,
        titulo: "Nueva tarea",
        mensaje: "Se te ha asignado una nueva tarea",
        tipo: "info",
        link: "/tareas/1",
      });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            usuario_id: 1,
            titulo: "Nueva tarea",
            mensaje: "Se te ha asignado una nueva tarea",
            tipo: "info",
            link: "/tareas/1",
            leida: false,
          },
        ],
      });

      await crearNotificacion(req, res);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(mockTo).toHaveBeenCalledWith("usuario_1");
      expect(mockEmit).toHaveBeenCalledWith(
        "nueva_notificacion",
        expect.objectContaining({ id: 10, titulo: "Nueva tarea" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
    });

    it("retorna error si usuario_id no es válido", async () => {
      const req = mockReq({
        usuario_id: "abc",
        titulo: "Test",
        mensaje: "Error test",
      });
      const res = mockRes();

      await crearNotificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("usuario_id inválido") })
      );
    });

    it("maneja errores del servidor", async () => {
      const req = mockReq({
        usuario_id: 1,
        titulo: "Error DB",
        mensaje: "Fallo al insertar",
      });
      const res = mockRes();

      pool.query.mockRejectedValueOnce(new Error("DB error"));

      await crearNotificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Error creando notificación" })
      );
    });
  });

  // ===================================
  // 🔹 obtenerNotificaciones
  // ===================================
  describe("obtenerNotificaciones", () => {
    it("debe retornar lista de notificaciones de un usuario", async () => {
      const req = mockReq({}, { usuario_id: 1 });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, titulo: "Tarea asignada", usuario_id: 1 },
          { id: 2, titulo: "Mantenimiento programado", usuario_id: 1 },
        ],
      });

      await obtenerNotificaciones(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM notificaciones"),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]);
    });

    it("retorna error si usuario_id no es válido", async () => {
      const req = mockReq({}, { usuario_id: "xyz" });
      const res = mockRes();

      await obtenerNotificaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("usuario_id inválido") })
      );
    });

    it("maneja error en la base de datos", async () => {
      const req = mockReq({}, { usuario_id: 1 });
      const res = mockRes();

      pool.query.mockRejectedValueOnce(new Error("Error de conexión"));

      await obtenerNotificaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Error obteniendo notificaciones" })
      );
    });
  });

  // ===================================
  // 🔹 marcarLeida
  // ===================================
  describe("marcarLeida", () => {
    it("debe marcar la notificación como leída correctamente", async () => {
      const req = mockReq({}, { id: 5 });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({
        rows: [{ id: 5, leida: true }],
      });

      await marcarLeida(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE notificaciones"),
        [5]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 5, leida: true }));
    });

    it("retorna error si id no es válido", async () => {
      const req = mockReq({}, { id: "abc" });
      const res = mockRes();

      await marcarLeida(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("id inválido") })
      );
    });

    it("retorna 404 si no se encuentra la notificación", async () => {
      const req = mockReq({}, { id: 99 });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({ rows: [] });

      await marcarLeida(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Notificación no encontrada" })
      );
    });

    it("maneja error interno de la base de datos", async () => {
      const req = mockReq({}, { id: 1 });
      const res = mockRes();

      pool.query.mockRejectedValueOnce(new Error("DB error"));

      await marcarLeida(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Error actualizando notificación" })
      );
    });
  });
});
