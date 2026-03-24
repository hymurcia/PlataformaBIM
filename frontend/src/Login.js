import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import escudo from "./assets/ESCUDO COLOR.png";
import fondo from "./assets/campus1.jpg";
import API_BASE_URL from "./utils/config";

const Login = ({ setAuth }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const navigate = useNavigate();

  // ======================
  // Manejo de cambios
  // ======================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ======================
  // LOGIN
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        withCredentials: true,
      });

      if (!response.data.token || !response.data.user?.rol_id) {
        throw new Error("Respuesta del servidor incompleta");
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setAuth({
        isAuthenticated: true,
        user: response.data.user,
        role: response.data.user.rol_id,
      });

      if (response.data.user.rol_id === 2) {
        navigate("/admin");
      } else {
        navigate("/perfil");
      }
    } catch (err) {
      console.error("Error durante login:", err);
      setError(err.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // FORGOT PASSWORD
  // ======================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setForgotMessage("");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/forgot`,
        { email: forgotEmail },
        { withCredentials: true }
      );
      setForgotMessage(res.data.message);
    } catch (err) {
      console.error("Error durante recuperación:", err);
      setError(err.response?.data?.error || "Error al solicitar recuperación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundImage: `url(${fondo})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        fontFamily: "Poppins, Arial, sans-serif",
      }}
    >
      {/* Capa verde de opacidad */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 72, 43, 0.5)",
          zIndex: 1,
        }}
      ></div>

      {/* Contenedor principal */}
      <div
        style={{
          maxWidth: "400px",
          width: "90%",
          padding: "2.5rem",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          position: "relative",
          zIndex: 2,
          animation: "fadeIn 1s ease-in-out",
        }}
      >
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Escudo */}
        <img
          src={escudo}
          alt="Escudo institucional"
          style={{
            display: "block",
            margin: "0 auto 1.8rem",
            width: "110px",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
          }}
        />

        {/* Título */}
        <h2
          style={{
            textAlign: "center",
            color: "#00482B",
            fontWeight: "700",
            marginBottom: "1.8rem",
          }}
        >
          {forgotMode ? "Recuperar Contraseña" : "Iniciar Sesión"}
        </h2>

        {/* Mensajes */}
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

        {forgotMessage && (
          <div
            style={{
              backgroundColor: "#007B3E",
              color: "#fff",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}
          >
            ✅ {forgotMessage}
          </div>
        )}

        {/* ===== FORMULARIO LOGIN ===== */}
        {!forgotMode ? (
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#00482B",
                  marginBottom: "0.4rem",
                }}
              >
                Correo electrónico:
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="usuario@x.com"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "1rem",
                  backgroundColor: "#f9f9f9",
                }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: "1.5rem", position: "relative" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#00482B",
                  marginBottom: "0.4rem",
                }}
              >
                Contraseña:
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.8rem 2.5rem 0.8rem 0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "1rem",
                  backgroundColor: "#f9f9f9",
                }}
              />
              {/* Icono para mostrar/ocultar */}
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "43px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  color: "#007B3E",
                  userSelect: "none",
                }}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

            {/* Botón login */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: loading ? "#cccccc" : "#007B3E",
                color: "#fff",
                padding: "0.9rem",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease, transform 0.2s",
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.backgroundColor = "#00482B";
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.backgroundColor = "#007B3E";
              }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>

            {/* Olvidó contraseña */}
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setError("");
                  setForgotMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007B3E",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>
          </form>
        ) : (
          // ===== FORMULARIO RECUPERAR CONTRASEÑA =====
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#00482B",
                  marginBottom: "0.4rem",
                }}
              >
                Ingresa tu correo electrónico:
              </label>
              <input
                type="email"
                name="forgotEmail"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                placeholder="usuario@x.com"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "1rem",
                  backgroundColor: "#f9f9f9",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: loading ? "#cccccc" : "#007B3E",
                color: "#fff",
                padding: "0.9rem",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease, transform 0.2s",
              }}
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            {/* Volver */}
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError("");
                  setForgotMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007B3E",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Volver a iniciar sesión
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
