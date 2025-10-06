import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import escudo from "./assets/ESCUDO COLOR.png";
import fondo from "./assets/campus1.jpg";

// URL base configurable por variable de entorno
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const Registro = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Configura el dominio permitido
  const DOMINIO_PERMITIDO = "x.com";

  // Manejo de cambio en los campos
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@${DOMINIO_PERMITIDO}$`);
    const telefonoRegex = /^\d{10}$/;

    if (!emailRegex.test(formData.email)) {
      setError(`El correo debe ser del dominio @${DOMINIO_PERMITIDO}`);
      return;
    }

    if (!telefonoRegex.test(formData.telefono)) {
      setError("El teléfono debe tener exactamente 10 dígitos numéricos");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/registrar`, formData);
      alert(response.data.message);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al registrar. Inténtalo nuevamente.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${fondo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        fontFamily: "Poppins, Arial, sans-serif",
      }}
    >
      {/* Capa verde semitransparente */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 72, 43, 0.5)",
          zIndex: 1,
        }}
      ></div>

      {/* Contenedor principal */}
      <div
        style={{
          width: "90%",
          maxWidth: "440px",
          padding: "2.8rem",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          zIndex: 2,
          position: "relative",
          animation: "fadeInUp 0.9s ease-in-out",
        }}
      >
        <style>
          {`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(25px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Escudo */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <img
            src={escudo}
            alt="Escudo institucional"
            style={{
              width: "110px",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
            }}
          />
        </div>

        {/* Título */}
        <h2
          style={{
            textAlign: "center",
            color: "#00482B",
            fontWeight: "700",
            marginBottom: "1.8rem",
            fontSize: "1.6rem",
          }}
        >
          Crear una cuenta
        </h2>

        {/* Mensaje de error */}
        {error && (
          <div
            style={{
              backgroundColor: "#FBE122",
              color: "#00482B",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: "500",
              marginBottom: "1.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {[
            { name: "nombre", label: "Nombre", type: "text", placeholder: "Tu nombre" },
            { name: "apellido", label: "Apellido", type: "text", placeholder: "Tu apellido" },
            { name: "telefono", label: "Teléfono", type: "tel", placeholder: "10 dígitos" },
            { name: "email", label: "Correo electrónico", type: "email", placeholder: `usuario@${DOMINIO_PERMITIDO}` },
          ].map((field) => (
            <div key={field.name} style={{ marginBottom: "1.3rem" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.4rem",
                  color: "#00482B",
                }}
              >
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                minLength={field.name === "password" ? 6 : undefined}
                maxLength={field.name === "telefono" ? 10 : undefined}
                pattern={field.name === "telefono" ? "\\d{10}" : undefined}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "1rem",
                  backgroundColor: "#f9f9f9",
                  transition: "border-color 0.3s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#007B3E")}
                onBlur={(e) => (e.target.style.borderColor = "#ccc")}
              />
            </div>
          ))}

          {/* Campo de contraseña con icono */}
          <div style={{ marginBottom: "1.3rem", position: "relative" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "0.4rem",
                color: "#00482B",
              }}
            >
              Contraseña
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              minLength="6"
              style={{
                width: "100%",
                padding: "0.8rem 2.5rem 0.8rem 0.8rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "1rem",
                backgroundColor: "#f9f9f9",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#007B3E")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />

            {/* Icono mostrar/ocultar contraseña */}
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "38px",
                cursor: "pointer",
                color: "#007B3E",
                fontSize: "1.1rem",
                userSelect: "none",
              }}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>

          {/* Botón */}
          <button
            type="submit"
            style={{
              width: "100%",
              backgroundColor: "#007B3E",
              color: "#fff",
              padding: "0.9rem",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "1rem",
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "background-color 0.3s ease, transform 0.2s",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#00482B";
              e.target.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#007B3E";
              e.target.style.transform = "scale(1)";
            }}
          >
            Registrarse
          </button>
        </form>

        {/* Enlace a login */}
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <small>
            ¿Ya tienes una cuenta?{" "}
            <a
              href="/login"
              style={{
                color: "#007B3E",
                fontWeight: "600",
                textDecoration: "none",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              Inicia sesión
            </a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Registro;
