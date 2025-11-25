// tests/adminUsuarios.test.js
require("./mocks"); // importa mocks
const request = require("supertest");
const app = require("../index");
const pool = require("../db");

let usuarioId = 1;

describe("🧪 API de Admin Usuarios (mock BD)", () => {
  beforeEach(() => pool.query.mockReset());

  test("📋 Debe obtener usuarios (GET /admin/usuarios)", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: usuarioId, nombre: "Juan", apellido: "Perez", email: "juan@mail.com", telefono: "123", rol_id: 1, fecha_creacion: "2025-01-01" }] });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const res = await request(app).get("/admin/usuarios").set("user-id", "1");

    expect(res.statusCode).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).toHaveProperty("nombre", "Juan");
    expect(res.body.total).toBe(1);
  });

  test("➕ Debe crear un nuevo usuario (POST /admin/usuarios)", async () => {
    const nuevoUsuario = { nombre: "Ana", apellido: "Lopez", email: "ana@mail.com", telefono: "321", password: "1234", rol_id: 2 };
    pool.query.mockResolvedValueOnce({ rows: [{ id: usuarioId, ...nuevoUsuario, fecha_creacion: "2025-01-01" }] });

    const res = await request(app).post("/admin/usuarios").set("user-id", "1").send(nuevoUsuario);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id", usuarioId);
    expect(res.body).toHaveProperty("nombre", "Ana");
  });

  test("✏️ Debe actualizar un usuario (PUT /admin/usuarios/:id)", async () => {
    const actualizado = { nombre: "Ana Maria", apellido: "Lopez", email: "ana@mail.com", telefono: "321", rol_id: 2 };
    pool.query.mockResolvedValueOnce({ rows: [{ id: usuarioId, ...actualizado, fecha_creacion: "2025-01-01" }] });

    const res = await request(app).put(`/admin/usuarios/${usuarioId}`).set("user-id", "1").send(actualizado);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("nombre", "Ana Maria");
  });

  test("🗑️ Debe eliminar un usuario (DELETE /admin/usuarios/:id)", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).delete(`/admin/usuarios/${usuarioId}`).set("user-id", "1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Usuario eliminado correctamente");
  });

  test("🎭 Debe obtener roles disponibles (GET /admin/roles)", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: "Admin" }, { id: 2, nombre: "Usuario" }] });

    const res = await request(app).get("/admin/roles").set("user-id", "1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("nombre", "Admin");
  });
});
