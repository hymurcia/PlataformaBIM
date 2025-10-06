import React, { useEffect, useState } from "react";
import facatativa2 from "../assets/faca12.jpg"; // ✅ Ruta corregida (usa "../" para salir de /components)

// 🌎 URL base del backend
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://192.168.56.1:5000";

const Clima = () => {
  const [clima, setClima] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClima = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clima/facatativa`);
        if (!res.ok) throw new Error("Error al obtener el clima");
        const data = await res.json();
        setClima(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClima();
  }, []);

  if (loading)
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Cargando clima...</p>
      </div>
    );

  if (error)
    return (
      <div style={styles.centerContainer}>
        <p style={styles.errorText}>⚠️ Error: {error}</p>
      </div>
    );

  return (
    <div
      style={{
        ...styles.pageContainer,
        backgroundImage: `url(${facatativa2})`,
      }}
    >
      <div style={styles.overlay}></div>

      <div style={styles.card}>
        <h2 style={styles.title}>🌤️ Clima en {clima.name}</h2>

        <div style={styles.infoContainer}>
          <img
            src={`http://openweathermap.org/img/wn/${clima.weather[0].icon}@4x.png`}
            alt="icono clima"
            style={styles.icon}
          />

          <div style={styles.details}>
            <p>
              <strong>🌡️ Temperatura:</strong> {clima.main.temp} °C
            </p>
            <p>
              <strong>🔥 Sensación térmica:</strong> {clima.main.feels_like} °C
            </p>
            <p>
              <strong>💧 Humedad:</strong> {clima.main.humidity}%
            </p>
            <p>
              <strong>🌈 Condición:</strong>{" "}
              {clima.weather[0].description.charAt(0).toUpperCase() +
                clima.weather[0].description.slice(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎨 Estilos visuales
const styles = {
  pageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    zIndex: 1,
  },
  card: {
    position: "relative",
    zIndex: 2,
    width: "600px",
    padding: "35px",
    borderRadius: "24px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  title: {
    fontSize: "2.2em",
    color: "#004d40",
    marginBottom: "25px",
  },
  infoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
  },
  icon: {
    width: "140px",
    height: "140px",
  },
  details: {
    textAlign: "left",
    color: "#222",
    fontSize: "1.2em",
    lineHeight: "1.8em",
  },
  centerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #b2ebf2 0%, #e0f7fa 100%)",
  },
  spinner: {
    border: "6px solid #f3f3f3",
    borderTop: "6px solid #00796b",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "15px",
    fontSize: "1.2em",
    color: "#004d40",
  },
  errorText: {
    color: "#d32f2f",
    fontWeight: "bold",
    fontSize: "1.2em",
  },
};

// ⏳ Animación del spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  const keyframes =
    "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

export default Clima;
