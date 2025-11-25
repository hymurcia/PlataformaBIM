// tests/auth.test.js
const { registrarUsuario, loginUsuario, forgotPassword, resetPassword } = require('../controllers/authController');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { generateToken } = require('../utils/jwt');

jest.mock('../db');
jest.mock('bcryptjs');
jest.mock('crypto');
jest.mock('nodemailer');
jest.mock('../utils/jwt');

// 🧱 Funciones helper
const mockReq = (body = {}) => ({ body });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.BCRYPT_SALT_ROUNDS = '10';
  process.env.EMAIL_USER = 'test@gmail.com';
  process.env.EMAIL_PASS = 'pass';
  process.env.FRONTEND_URL = 'http://localhost:3000';
});

describe('AuthController', () => {
  // ===================================
  // 🔹 registrarUsuario
  // ===================================
  describe('registrarUsuario', () => {
    it('debe registrar un usuario correctamente', async () => {
      const req = mockReq({
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '3001234567',
        email: 'juan@test.com',
        password: '12345678',
      });
      const res = mockRes();

      bcrypt.hash.mockResolvedValue('hashedPass');
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          telefono: '3001234567',
          email: 'juan@test.com',
          rol_id: 4,
          fecha_creacion: '2025-10-25',
        }],
      });
      generateToken.mockReturnValue('fakeToken');

      await registrarUsuario(req, res);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Usuario registrado con éxito',
        token: 'fakeToken',
      }));
    });

    it('debe devolver error si faltan campos', async () => {
      const req = mockReq({});
      const res = mockRes();

      await registrarUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Todos los campos son requeridos',
      }));
    });
  });

  // ===================================
  // 🔹 loginUsuario
  // ===================================
  describe('loginUsuario', () => {
    it('debe permitir login exitoso', async () => {
      const req = mockReq({ email: 'user@test.com', password: '123456' });
      const res = mockRes();

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          telefono: '3001234567',
          email: 'user@test.com',
          password: 'hashed',
          rol_id: 2,
          rol_nombre: 'admin',
        }],
      });
      bcrypt.compare.mockResolvedValue(true);
      generateToken.mockReturnValue('jwtToken');

      await loginUsuario(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Login exitoso',
        token: 'jwtToken',
      }));
    });

    it('debe rechazar credenciales inválidas', async () => {
      const req = mockReq({ email: 'user@test.com', password: 'wrong' });
      const res = mockRes();

      pool.query.mockResolvedValue({ rows: [] });

      await loginUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Credenciales inválidas',
      }));
    });
  });

  // ===================================
  // 🔹 forgotPassword
  // ===================================
  describe('forgotPassword', () => {
    it('envía correo si el usuario existe', async () => {
      const req = mockReq({ email: 'user@test.com' });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 10, nombre: 'Juan' }],
      });

      crypto.randomBytes.mockReturnValue(Buffer.from('token123'));
      crypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hash123'),
      });

      const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
      const verifyMock = jest.fn().mockResolvedValue(true);
      nodemailer.createTransport.mockReturnValue({
        sendMail: sendMailMock,
        verify: verifyMock,
      });

      await forgotPassword(req, res);

      expect(sendMailMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('enviado un enlace'),
      }));
    });

    it('responde igual aunque el usuario no exista', async () => {
      const req = mockReq({ email: 'no@existe.com' });
      const res = mockRes();

      pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await forgotPassword(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('enviado un enlace'),
      }));
    });
  });

  // ===================================
  // 🔹 resetPassword
  // ===================================
  describe('resetPassword', () => {
    it('debe actualizar la contraseña si el token es válido', async () => {
      const req = mockReq({ token: 'validToken', password: 'newPassword123' });
      const res = mockRes();

      crypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashOK'),
      });

      pool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, usuario_id: 10 }] }) // token válido
        .mockResolvedValueOnce({}) // update password
        .mockResolvedValueOnce({}) // marcar token como usado
        .mockResolvedValueOnce({}); // limpiar tokens antiguos

      bcrypt.hash.mockResolvedValue('newHashedPass');

      await resetPassword(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Contraseña actualizada correctamente',
      });
    });

    it('retorna error si token es inválido o expirado', async () => {
      const req = mockReq({ token: 'badToken', password: 'newpassword' }); // >= 8 chars
      const res = mockRes();

      crypto.createHash.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('badHash'),
      });

      pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Token inválido o expirado',
      }));
    });
  });
});
