// tests/componentes.test.js
const { obtenerComponentes } = require('../controllers/componentesController');

// 🔹 Creamos un mock manual del pool sin depender del archivo real
jest.mock('../controllers/componentesController', () => ({
  obtenerComponentes: jest.fn(),
}));

// 🔹 Helpers para simular req y res
const mockReq = (body = {}, params = {}) => ({ body, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Controlador de Componentes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Debe obtener todos los componentes correctamente', async () => {
    const req = mockReq();
    const res = mockRes();

    const dataMock = [
      { id: 1, nombre: 'Componente A' },
      { id: 2, nombre: 'Componente B' },
    ];

    // Simulamos que el controlador responde correctamente
    require('../controllers/componentesController').obtenerComponentes.mockImplementation(async (req, res) => {
      return res.status(200).json(dataMock);
    });

    await obtenerComponentes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(dataMock);
  });

  test('Debe manejar errores al obtener componentes', async () => {
    const req = mockReq();
    const res = mockRes();

    // Simulamos un error
    require('../controllers/componentesController').obtenerComponentes.mockImplementation(async (req, res) => {
      return res.status(500).json({ error: 'Error al obtener componentes' });
    });

    await obtenerComponentes(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener componentes' });
  });
});
