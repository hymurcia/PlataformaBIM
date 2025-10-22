// ======================
// src/pages/ResetPassword.jsx
// ======================
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import escudo from "../assets/ESCUDO COLOR.png";
import fondo from "../assets/campus1.jpg";

// ======================
// Configuración API
// ======================
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ======================
  // Envío del formulario
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || !confirm) return setError("Por favor, completa ambos campos");
    if (password !== confirm) return setError("Las contraseñas no coinciden");

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/reset`, { token, password });
      setMessage(res.data.message || "Contraseña actualizada correctamente ✅");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      console.error("Error al restablecer contraseña:", err);
      setError(err.response?.data?.error || "Error al restablecer la contraseña");
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
      {/* Capa verde translúcida */}
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

        {/* Escudo institucional */}
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
          Restablecer Contraseña
        </h2>

        {/* Mensajes de error o éxito */}
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
        {message && (
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
            ✅ {message}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Nueva contraseña */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#00482B",
                marginBottom: "0.4rem",
              }}
            >
              Nueva contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength="6"
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

          {/* Confirmar contraseña */}
          <div style={{ marginBottom: "1.8rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                color: "#00482B",
                marginBottom: "0.4rem",
              }}
            >
              Confirmar contraseña:
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              required
              minLength="6"
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

          {/* Botón de envío */}
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
            {loading ? "Actualizando..." : "Cambiar contraseña"}
          </button>

          {/* Volver al login */}
          <p style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
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
      </div>
    </div>
  );
};

export default ResetPassword;
