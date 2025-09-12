import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Registro = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[a-zA-Z0-9._%+-]+@midominio\.com$/;
    const telefonoRegex = /^\d{10}$/;

    if (!emailRegex.test(formData.email)) {
      setError("El correo debe ser del dominio @midominio.com");
      return;
    }

    if (!telefonoRegex.test(formData.telefono)) {
      setError("El teléfono debe tener exactamente 10 dígitos numéricos");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/auth/registrar",
        formData
      );
      alert(response.data.message);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al registrar");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "#f4f7f6" }}>
      <div
        className="shadow p-4 rounded-4"
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#fff",
          border: "1px solid #e0e0e0",
        }}
      >
        <h3 className="text-center mb-3 fw-bold" style={{ color: "#00A99D" }}>
          Crear Cuenta
        </h3>

        {error && <div className="alert alert-danger text-center">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Nombre</label>
            <input
              type="text"
              name="nombre"
              className="form-control rounded-3"
              value={formData.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Apellido</label>
            <input
              type="text"
              name="apellido"
              className="form-control rounded-3"
              value={formData.apellido}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              className="form-control rounded-3"
              value={formData.telefono}
              onChange={handleChange}
              required
              pattern="\d{10}"
              maxLength="10"
              placeholder="Solo 10 dígitos"
            />
            <div className="form-text">Debe tener exactamente 10 dígitos</div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Correo electrónico</label>
            <input
              type="email"
              name="email"
              className="form-control rounded-3"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="usuario@midominio.com"
            />
            <div className="form-text">Debe usar un correo @midominio.com</div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Contraseña</label>
            <input
              type="password"
              name="password"
              className="form-control rounded-3"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
            />
            <div className="form-text">Mínimo 6 caracteres</div>
          </div>

          <div className="d-grid">
            <button
              type="submit"
              style={{
                backgroundColor: "#00A99D",
                border: "none",
                padding: "10px",
                borderRadius: "12px",
                fontWeight: "bold",
                color: "#fff",
                transition: "0.3s",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#008d82")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#00A99D")}
            >
              Registrarse
            </button>
          </div>
        </form>

        <div className="mt-3 text-center">
          <small>
            ¿Ya tienes cuenta?{" "}
            <a href="/login" style={{ color: "#00A99D", fontWeight: "600" }}>
              Inicia sesión
            </a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Registro;
