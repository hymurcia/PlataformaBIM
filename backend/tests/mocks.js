// tests/mocks.js
jest.mock("../db", () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

jest.mock("../middleware/roles", () => () => (req, res, next) => next());

jest.mock("../utils/notificar", () => ({
  crearNotificacion: jest.fn(() => Promise.resolve(true)),
  setSocket: jest.fn(),
}));
